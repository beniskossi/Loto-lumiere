-- Create prediction ledger for walk-forward testing and platt scaling
CREATE TABLE prediction_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_date DATE NOT NULL,
    algorithm_name TEXT NOT NULL,
    predicted_numbers INTEGER[] NOT NULL,
    confidence_declared NUMERIC NOT NULL,
    actual_winning_numbers INTEGER[],
    matches_count INTEGER,
    log_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_prediction_ledger_draw_date ON prediction_ledger(draw_date);
CREATE INDEX idx_prediction_ledger_algorithm ON prediction_ledger(algorithm_name);

-- Create table to track historically calibrated algorithm performance
CREATE TABLE IF NOT EXISTS algorithm_calibration_metrics (
    algorithm_name TEXT PRIMARY KEY,
    total_predictions INTEGER DEFAULT 0,
    average_matches NUMERIC DEFAULT 0,
    historical_accuracy NUMERIC DEFAULT 0.0556, -- Default to Uniform 5/90
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
