'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Save, CheckCircle } from 'lucide-react'

interface Config {
  prompts: {
    classifier_system: string
    classifier_user_template: string
    writer_linkedin_system: string
    writer_linkedin_user_template: string
    writer_personal_system: string
    writer_personal_user_template: string
  }
}

export default function PromptsPage() {
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

  const savePrompts = async () => {
    if (!config) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/config/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.prompts),
      })
      setMessage('Prompts sparade framgångsrikt')
    } catch (error) {
      setMessage('Sparning misslyckades')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePrompt = (key: keyof Config['prompts'], value: string) => {
    if (!config) return
    setConfig({
      ...config,
      prompts: {
        ...config.prompts,
        [key]: value
      }
    })
  }

  if (!config) {
    return <div>Laddar...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prompts</h1>
        <Button onClick={savePrompts} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Spara prompts
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
          <CardTitle>Klassificerare - System</CardTitle>
          <CardDescription>
            Systemprompt för LLM-klassificering av artiklar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.classifier_system}
            onChange={(e) => updatePrompt('classifier_system', e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Klassificerare - Användar-mall</CardTitle>
          <CardDescription>
            Mall för användarprompt med variabler: include_any, include_all, exclude_any, source_label, source_weight, title, url, snippet_or_fulltext
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.classifier_user_template}
            onChange={(e) => updatePrompt('classifier_user_template', e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Artikel - System</CardTitle>
          <CardDescription>
            Systemprompt för att skriva LinkedIn-artiklar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.writer_linkedin_system}
            onChange={(e) => updatePrompt('writer_linkedin_system', e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Artikel - Användar-mall</CardTitle>
          <CardDescription>
            Mall för LinkedIn-artikel med variabler: title, content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.writer_linkedin_user_template}
            onChange={(e) => updatePrompt('writer_linkedin_user_template', e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personligt Inlägg - System</CardTitle>
          <CardDescription>
            Systemprompt för att skriva personliga LinkedIn-inlägg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.writer_personal_system}
            onChange={(e) => updatePrompt('writer_personal_system', e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personligt Inlägg - Användar-mall</CardTitle>
          <CardDescription>
            Mall för personligt inlägg med variabler: title, content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.writer_personal_user_template}
            onChange={(e) => updatePrompt('writer_personal_user_template', e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  )
}

