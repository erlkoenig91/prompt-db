{{/*
Expand the name of the chart.
*/}}
{{- define "prompt-db.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "prompt-db.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Namespace used in resource metadata.
*/}}
{{- define "prompt-db.namespace" -}}
{{- if .Values.namespace.create }}
{{- .Values.namespace.name }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Chart and app labels.
*/}}
{{- define "prompt-db.labels" -}}
helm.sh/chart: {{ include "prompt-db.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "prompt-db.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels shared by all components.
*/}}
{{- define "prompt-db.selectorLabels" -}}
app.kubernetes.io/name: {{ include "prompt-db.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "prompt-db.backend.selectorLabels" -}}
{{ include "prompt-db.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{- define "prompt-db.frontend.selectorLabels" -}}
{{ include "prompt-db.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{- define "prompt-db.postgresql.selectorLabels" -}}
{{ include "prompt-db.selectorLabels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
Backend service name (used by frontend upstream and ingress).
*/}}
{{- define "prompt-db.backend.fullname" -}}
{{- printf "%s-backend" (include "prompt-db.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "prompt-db.frontend.fullname" -}}
{{- printf "%s-frontend" (include "prompt-db.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "prompt-db.postgresql.fullname" -}}
{{- printf "%s-postgres" (include "prompt-db.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
ConfigMap and Secret names.
*/}}
{{- define "prompt-db.configMapName" -}}
{{- printf "%s-config" (include "prompt-db.fullname" .) }}
{{- end }}

{{- define "prompt-db.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "prompt-db.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Image helpers.
*/}}
{{- define "prompt-db.backend.image" -}}
{{- $tag := default .Chart.AppVersion .Values.backend.image.tag }}
{{- printf "%s/%s:%s" .Values.imageRegistry .Values.backend.image.repository $tag }}
{{- end }}

{{- define "prompt-db.frontend.image" -}}
{{- $tag := default .Chart.AppVersion .Values.frontend.image.tag }}
{{- printf "%s/%s:%s" .Values.imageRegistry .Values.frontend.image.repository $tag }}
{{- end }}

{{- define "prompt-db.postgresql.image" -}}
{{- printf "%s:%s" .Values.postgresql.image.repository .Values.postgresql.image.tag }}
{{- end }}

{{/*
DATABASE_URL when bundled PostgreSQL is enabled.
*/}}
{{- define "prompt-db.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql+asyncpg://%s:%s@%s:5432/%s" .Values.postgresql.auth.username .Values.secrets.postgresPassword (include "prompt-db.postgresql.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- required "secrets.databaseUrl is required when postgresql.enabled is false" .Values.secrets.databaseUrl }}
{{- end }}
{{- end }}
