#!/bin/sh
set -eu

secret_source="${GOOGLE_APPLICATION_CREDENTIALS:-/run/secrets/firebase_admin_credentials}"
runtime_directory="/app/.runtime"
runtime_credentials="$runtime_directory/firebase-admin-credentials.json"

if [ ! -r "$secret_source" ]; then
  echo "Secret administrativo do Firebase não está acessível em $secret_source" >&2
  exit 1
fi

mkdir -p "$runtime_directory"
cp "$secret_source" "$runtime_credentials"
chown -R nextjs:nodejs "$runtime_directory"
chmod 700 "$runtime_directory"
chmod 400 "$runtime_credentials"

export GOOGLE_APPLICATION_CREDENTIALS="$runtime_credentials"
exec su-exec nextjs:nodejs "$@"
