-- Add new quest types for reactions, stories, and daily logins
INSERT INTO public.quests (title, description, xp_reward, quest_type, requirement_type, requirement_count, is_active) VALUES
-- Daily quests
('Reaction Master', 'React to 5 messages today', 15, 'daily', 'reactions_given', 5, true),
('Story Watcher', 'View 3 stories today', 10, 'daily', 'stories_viewed', 3, true),
('Daily Check-in', 'Log in today to claim your bonus', 5, 'daily', 'daily_login', 1, true),

-- Weekly quests
('Emoji Express', 'Give 25 reactions this week', 40, 'weekly', 'reactions_given', 25, true),
('Story Explorer', 'View 15 stories this week', 35, 'weekly', 'stories_viewed', 15, true),
('Consistent Visitor', 'Log in 5 days this week', 50, 'weekly', 'daily_login', 5, true),

-- Achievement quests
('First Reaction', 'Give your first reaction to a message', 10, 'achievement', 'reactions_given', 1, true),
('Story Enthusiast', 'View 50 stories total', 75, 'achievement', 'stories_viewed', 50, true),
('Dedicated User', 'Log in 30 days total', 150, 'achievement', 'daily_login', 30, true),
('Reaction King', 'Give 100 reactions total', 100, 'achievement', 'reactions_given', 100, true);