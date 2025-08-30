'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Save, CheckCircle } from 'lucide-react'

interface Config {
  model: string
  threshold: { importance: number }
  defaults: { min_words: number; max_age_days: number; language: string }
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config/')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const saveSettings = async () => {
    if (!config) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/config/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          importance_threshold: config.threshold.importance,
          min_words: config.defaults.min_words,
          max_age_days: config.defaults.max_age_days,
          language: config.defaults.language,
        }),
      })
      setMessage('Inställningar sparade framgångsrikt')
    } catch (error) {
      setMessage('Sparning misslyckades')
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfig = (field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      [field]: value
    })
  }

  const updateThreshold = (value: number[]) => {
    if (!config) return
    setConfig({
      ...config,
      threshold: { ...config.threshold, importance: value[0] }
    })
  }

  const updateDefaults = (field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      defaults: { ...config.defaults, [field]: value }
    })
  }

  if (!config) {
    return <div>Laddar...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inställningar</h1>
        <Button onClick={saveSettings} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Spara
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{message}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Modell</CardTitle>
          <CardDescription>
            OpenAI-modell som ska användas för klassificering och innehållsgenerering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={config.model}
            onChange={(e) => updateConfig('model', e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vikt-tröskel</CardTitle>
          <CardDescription>
            Minsta vikt som krävs för att behålla en artikel (0.0 - 5.0)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Vikt: {config.threshold.importance}</Label>
            </div>
            <Slider
              value={[config.threshold.importance]}
              onValueChange={updateThreshold}
              max={5}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Standardvärden</CardTitle>
          <CardDescription>
            Standardvärden för nya feed-regler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Min ord</Label>
              <Input
                type="number"
                value={config.defaults.min_words}
                onChange={(e) => updateDefaults('min_words', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Max ålder (dagar)</Label>
              <Input
                type="number"
                value={config.defaults.max_age_days}
                onChange={(e) => updateDefaults('max_age_days', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Språk</Label>
              <Input
                value={config.defaults.language}
                onChange={(e) => updateDefaults('language', e.target.value)}
                placeholder="sv, en, eller tom"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Systeminformation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Tidszon: Europe/Stockholm (skrivskyddad)</p>
            <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

