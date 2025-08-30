'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Upload, Download, Save, CheckCircle } from 'lucide-react'

interface FeedRule {
  feed_url: string
  label: string
  topic_default: string
  include_any: string[]
  include_all: string[]
  exclude_any: string[]
  min_words: number
  max_age_days: number
  language: string
  source_weight: number
  enabled: boolean
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<FeedRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadFeeds()
  }, [])

  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/feeds/')
      const data = await response.json()
      setFeeds(data)
    } catch (error) {
      console.error('Failed to load feeds:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/feeds/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      setMessage(`Successfully uploaded ${result.count} feeds`)
      loadFeeds()
    } catch (error) {
      setMessage('Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  const exportFeeds = async () => {
    try {
      const response = await fetch('/api/feeds/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'feeds.xlsx'
      a.click()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const saveFeeds = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/config/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds }),
      })
      setMessage('Feeds saved successfully')
    } catch (error) {
      setMessage('Save failed')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFeed = (index: number, field: keyof FeedRule, value: any) => {
    const updatedFeeds = [...feeds]
    updatedFeeds[index] = { ...updatedFeeds[index], [field]: value }
    setFeeds(updatedFeeds)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feeds</h1>
        <div className="flex gap-2">
          <Button onClick={exportFeeds} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportera Excel
          </Button>
          <Button onClick={saveFeeds} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Spara ändringar
          </Button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{message}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ladda upp Excel</CardTitle>
          <CardDescription>
            Ladda upp en Excel-fil med feed-regler. Kolumnerna ska vara: feed_url, label, topic_default, include_any, include_all, exclude_any, min_words, max_age_days, language, source_weight, enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <Upload className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed-regler</CardTitle>
          <CardDescription>
            Redigera feed-regler nedan. Ändringar sparas inte automatiskt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feeds.map((feed, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{feed.label}</h3>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={feed.enabled}
                      onCheckedChange={(checked) => updateFeed(index, 'enabled', checked)}
                    />
                    <Badge variant={feed.enabled ? 'default' : 'secondary'}>
                      {feed.enabled ? 'Aktiverad' : 'Inaktiverad'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Feed URL</Label>
                    <Input
                      value={feed.feed_url}
                      onChange={(e) => updateFeed(index, 'feed_url', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Standardämne</Label>
                    <select
                      value={feed.topic_default}
                      onChange={(e) => updateFeed(index, 'topic_default', e.target.value)}
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="SEO & AI visibility">SEO & AI visibility</option>
                      <option value="Webbanalys & AI">Webbanalys & AI</option>
                      <option value="Generativ AI">Generativ AI</option>
                    </select>
                  </div>
                  <div>
                    <Label>Min ord</Label>
                    <Input
                      type="number"
                      value={feed.min_words}
                      onChange={(e) => updateFeed(index, 'min_words', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Max ålder (dagar)</Label>
                    <Input
                      type="number"
                      value={feed.max_age_days}
                      onChange={(e) => updateFeed(index, 'max_age_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Språk</Label>
                    <Input
                      value={feed.language}
                      onChange={(e) => updateFeed(index, 'language', e.target.value)}
                      placeholder="sv, en, eller tom"
                    />
                  </div>
                  <div>
                    <Label>Källvikt (0.0-2.0)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={feed.source_weight}
                      onChange={(e) => updateFeed(index, 'source_weight', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Inkludera någon av (kommaseparerat)</Label>
                    <Input
                      value={feed.include_any.join(', ')}
                      onChange={(e) => updateFeed(index, 'include_any', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                  <div>
                    <Label>Inkludera alla (kommaseparerat)</Label>
                    <Input
                      value={feed.include_all.join(', ')}
                      onChange={(e) => updateFeed(index, 'include_all', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                  <div>
                    <Label>Exkludera någon av (kommaseparerat)</Label>
                    <Input
                      value={feed.exclude_any.join(', ')}
                      onChange={(e) => updateFeed(index, 'exclude_any', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
