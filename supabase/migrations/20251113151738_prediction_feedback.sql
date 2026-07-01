CREATE TABLE IF NOT EXISTS user_prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  matches INTEGER CHECK (matches >= 0 AND matches <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_user ON user_prediction_feedback(user_id);
CREATE INDEX idx_feedback_prediction ON user_prediction_feedback(prediction_id);
CREATE INDEX idx_feedback_rating ON user_prediction_feedback(rating);

ALTER TABLE user_prediction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON user_prediction_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON user_prediction_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
