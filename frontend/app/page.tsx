'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface RunResponse {
  kept_count: number
  skipped_count: number
  filtered_count: number
  duration_seconds: number
  items: RunItem[]
  dry_run: boolean
}

interface RunItem {
  article: {
    title: string
    url: string
    source_label: string
  }
  score_result?: {
    topic: string
    relevance: number
    novelty: number
    authority: number
    actionability: number
    importance: number
    keep: boolean
    reason_short: string
  }
  linkedin_article?: string
  personal_post?: string
  status: string
  reason: string
}

export default function Dashboard() {
  const [dryRun, setDryRun] = useState(true)
  const [limit, setLimit] = useState<number | undefined>()
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([])
  const [availableFeeds, setAvailableFeeds] = useState<Array<{feed_url: string, label: string}>>([])
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<RunResponse | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Load available feeds
    fetch('/api/feeds/')
      .then(res => res.json())
      .then(data => {
        setAvailableFeeds(data.map((feed: any) => ({
          feed_url: feed.feed_url,
          label: feed.label
        })))
      })
      .catch(console.error)
  }, [])

  const runPipeline = async () => {
    setIsRunning(true)
    setResults(null)

    try {
      const params = new URLSearchParams()
      params.append('dry_run', dryRun.toString())
      if (limit) params.append('limit', limit.toString())
      selectedFeeds.forEach(feed => params.append('feeds', feed))

      const response = await fetch(`/api/run/?${params}`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Pipeline run failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Körning</h1>
        <Button onClick={runPipeline} disabled={isRunning} className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          {isRunning ? 'Kör...' : 'Kör nu'}
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Kontroller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
            <Label htmlFor="dry-run">Dry run (förhandsvisning)</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="limit">Begränsa antal artiklar</Label>
              <Input
                id="limit"
                type="number"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Obegränsat"
              />
            </div>
            <div>
              <Label>Välj feeds (tomt = alla)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableFeeds.map((feed) => (
                  <div key={feed.feed_url} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={feed.feed_url}
                      checked={selectedFeeds.includes(feed.feed_url)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFeeds([...selectedFeeds, feed.feed_url])
                        } else {
                          setSelectedFeeds(selectedFeeds.filter(f => f !== feed.feed_url))
                        }
                      }}
                    />
                    <Label htmlFor={feed.feed_url} className="text-sm">{feed.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Behållna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{results.kept_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hoppade över</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{results.skipped_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtrerade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{results.filtered_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Varaktighet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.duration_seconds.toFixed(1)}s</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Resultat</CardTitle>
            <CardDescription>
              {results.dry_run ? 'Förhandsvisning' : 'Skrivet till Notion'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <a
                          href={item.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {item.article.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline">{item.article.source_label}</Badge>
                        <Badge variant={item.status === 'kept' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                      
                      {item.score_result && (
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm mb-2">
                          <div>Ämne: {item.score_result.topic}</div>
                          <div>Relevans: {item.score_result.relevance}/5</div>
                          <div>Nyphet: {item.score_result.novelty}/5</div>
                          <div>Autoritet: {item.score_result.authority}/5</div>
                          <div>Handlingskraft: {item.score_result.actionability}/5</div>
                          <div>Vikt: {item.score_result.importance}</div>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(index)}
                      className="ml-4"
                    >
                      {expandedItems.has(index) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {expandedItems.has(index) && (item.linkedin_article || item.personal_post) && (
                    <div className="mt-4 space-y-4">
                      <Separator />
                      {item.linkedin_article && (
                        <div>
                          <h4 className="font-medium mb-2">LinkedIn Artikel</h4>
                          <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                            {item.linkedin_article}
                          </div>
                        </div>
                      )}
                      {item.personal_post && (
                        <div>
                          <h4 className="font-medium mb-2">Personligt Inlägg</h4>
                          <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                            {item.personal_post}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

