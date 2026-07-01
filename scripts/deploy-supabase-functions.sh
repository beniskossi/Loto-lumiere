#!/bin/bash

# Exit on error
set -e

# Ensure SUPABASE_PROJECT_ID is set
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "Error: SUPABASE_PROJECT_ID environment variable is not set."
  echo "Usage: SUPABASE_PROJECT_ID=your_project_id ./scripts/deploy-supabase-functions.sh"
  echo "Alternatively, you can link the project first: supabase link --project-ref your_project_id"
  exit 1
fi

echo "Deploying all Supabase Edge Functions to project $SUPABASE_PROJECT_ID..."

# This will deploy all functions in the supabase/functions directory
supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"

echo "Deployment complete."
