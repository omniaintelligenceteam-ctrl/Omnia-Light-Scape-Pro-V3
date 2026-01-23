import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

interface SettingsSnapshot {
  selectedFixtures?: string[];
  fixtureSubOptions?: Record<string, string[]>;
  colorTemperature?: string;
  lightIntensity?: number;
  beamAngle?: number;
  userPrompt?: string;
}

// POST /api/feedback - Save feedback
router.post('/', async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { userId: clerkUserId, projectId, rating, feedbackText, settingsSnapshot, generatedImageUrl } = req.body;

  if (!clerkUserId || !rating) {
    return res.status(400).json({ error: 'Missing required fields: userId, rating' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      // User not found - this is OK, just skip feedback storage
      console.log('User not found for feedback, skipping:', clerkUserId);
      return res.status(200).json({ success: true, skipped: true });
    }

    const supabaseUserId = userData.id;

    // Insert feedback record
    const { error: feedbackError } = await supabase
      .from('generation_feedback')
      .insert({
        user_id: supabaseUserId,
        project_id: projectId || null,
        rating,
        feedback_text: feedbackText || null,
        settings_snapshot: settingsSnapshot || {},
        generated_image_url: generatedImageUrl || null
      });

    if (feedbackError) {
      console.error('Feedback insert error:', feedbackError);
      return res.status(500).json({ error: feedbackError.message });
    }

    // Update aggregated preferences
    await updateUserPreferences(supabase, supabaseUserId, rating, settingsSnapshot, feedbackText);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Feedback API error:', error);
    return res.status(500).json({ error: 'Failed to save feedback', message: error.message });
  }
});

// GET /api/feedback - Fetch user preferences
router.get('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      // User not found - return null preferences
      return res.status(200).json({ preferences: null });
    }

    const supabaseUserId = userData.id;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', supabaseUserId)
      .single();

    // PGRST116 = no rows found (not an error, just means no preferences yet)
    if (error && error.code !== 'PGRST116') {
      console.error('Preferences fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ preferences: data || null });
  } catch (error: any) {
    console.error('Preferences API error:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences', message: error.message });
  }
});

async function updateUserPreferences(
  supabaseClient: any,
  userId: string,
  rating: string,
  settings: SettingsSnapshot,
  feedbackText?: string
) {
  try {
    // Fetch existing preferences
    let { data: prefs } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Initialize if doesn't exist
    if (!prefs) {
      const { data: newPrefs, error: insertError } = await supabaseClient
        .from('user_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create preferences:', insertError);
        return;
      }
      prefs = newPrefs;
    }

    // Build updates
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (rating === 'liked') {
      updates.total_liked = (prefs.total_liked || 0) + 1;

      // Learn from liked settings
      if (settings.colorTemperature) {
        updates.preferred_color_temp = settings.colorTemperature;
      }

      // Update intensity preferences (track range user likes)
      if (settings.lightIntensity !== undefined) {
        const currentRange = prefs.preferred_intensity_range || { min: 35, max: 55 };
        updates.preferred_intensity_range = {
          min: Math.min(currentRange.min, settings.lightIntensity),
          max: Math.max(currentRange.max, settings.lightIntensity)
        };
      }

      // Update beam angle preferences
      if (settings.beamAngle !== undefined) {
        const currentRange = prefs.preferred_beam_angle_range || { min: 25, max: 40 };
        updates.preferred_beam_angle_range = {
          min: Math.min(currentRange.min, settings.beamAngle),
          max: Math.max(currentRange.max, settings.beamAngle)
        };
      }

      // Extract and accumulate style keywords from fixture selections
      const styleKeywords = extractStyleKeywords(settings);
      if (styleKeywords.length) {
        const existingKeywords = prefs.style_keywords || [];
        updates.style_keywords = [...new Set([...existingKeywords, ...styleKeywords])];
      }
    }

    if (rating === 'disliked') {
      updates.total_disliked = (prefs.total_disliked || 0) + 1;

      // Learn what to avoid from feedback text
      if (feedbackText) {
        const avoidKeywords = extractAvoidKeywords(feedbackText);
        if (avoidKeywords.length) {
          const existingAvoid = prefs.avoid_keywords || [];
          updates.avoid_keywords = [...new Set([...existingAvoid, ...avoidKeywords])];
        }
      }
    }

    if (rating === 'saved') {
      updates.total_saved = (prefs.total_saved || 0) + 1;

      // Saved projects also count as positive signals - learn from settings
      if (settings.colorTemperature) {
        updates.preferred_color_temp = settings.colorTemperature;
      }

      const styleKeywords = extractStyleKeywords(settings);
      if (styleKeywords.length) {
        const existingKeywords = prefs.style_keywords || [];
        updates.style_keywords = [...new Set([...existingKeywords, ...styleKeywords])];
      }
    }

    // Apply updates
    await supabaseClient
      .from('user_preferences')
      .update(updates)
      .eq('user_id', userId);

  } catch (error) {
    console.error('Failed to update preferences:', error);
  }
}

function extractStyleKeywords(settings: SettingsSnapshot): string[] {
  const keywords: string[] = [];

  // Map fixture selections to style keywords
  if (settings.selectedFixtures) {
    if (settings.selectedFixtures.some(f => f.toLowerCase().includes('uplight') || f.toLowerCase().includes('up'))) {
      keywords.push('dramatic');
    }
    if (settings.selectedFixtures.some(f => f.toLowerCase().includes('path'))) {
      keywords.push('welcoming');
    }
    if (settings.selectedFixtures.some(f => f.toLowerCase().includes('accent'))) {
      keywords.push('detailed');
    }
    if (settings.selectedFixtures.some(f => f.toLowerCase().includes('soffit') || f.toLowerCase().includes('downlight'))) {
      keywords.push('architectural');
    }
  }

  // Map intensity to style
  if (settings.lightIntensity !== undefined) {
    if (settings.lightIntensity > 65) keywords.push('bright');
    if (settings.lightIntensity < 30) keywords.push('subtle');
  }

  // Map color temperature to warmth preference
  if (settings.colorTemperature) {
    if (settings.colorTemperature.includes('2700') || settings.colorTemperature.includes('Warm')) {
      keywords.push('warm');
    }
    if (settings.colorTemperature.includes('4000') || settings.colorTemperature.includes('5000') || settings.colorTemperature.includes('Cool')) {
      keywords.push('cool');
    }
  }

  return keywords;
}

function extractAvoidKeywords(feedbackText: string): string[] {
  const keywords: string[] = [];
  const text = feedbackText.toLowerCase();

  // Common complaints mapped to avoid keywords
  if (text.includes('too bright') || text.includes('very bright')) {
    keywords.push('overly bright');
  }
  if (text.includes('too dark') || text.includes('very dark') || text.includes('not enough light')) {
    keywords.push('too dim');
  }
  if (text.includes('harsh') || text.includes('hard shadows')) {
    keywords.push('harsh shadows');
  }
  if (text.includes('uneven') || text.includes('patchy')) {
    keywords.push('uneven distribution');
  }
  if (text.includes('asymmetr') || text.includes('unbalanced')) {
    keywords.push('asymmetrical');
  }
  if (text.includes('too many') || text.includes('cluttered') || text.includes('overwhelming')) {
    keywords.push('cluttered');
  }
  if (text.includes('not enough') || text.includes('too few') || text.includes('sparse')) {
    keywords.push('sparse');
  }

  return keywords;
}

export default router;
