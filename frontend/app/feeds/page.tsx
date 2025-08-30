'use client'

import { useState, useEffect } from 'react'

interface FeedRule {
  feed_url: string
  label: string
  source: string
  language: string
  topic_default: string
  enabled: boolean
}

interface GlobalRules {
  include_any: string[]
  include_all: string[]
  exclude_any: string[]
  min_words: number
  max_age_days: number
  language: string
  source_weight: number
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<FeedRule[]>([])
  const [globalRules, setGlobalRules] = useState<GlobalRules>({
    include_any: [],
    include_all: [],
    exclude_any: [],
    min_words: 200,
    max_age_days: 10,
    language: '',
    source_weight: 1.0
  })
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadFeeds()
    loadGlobalRules()
  }, [])

  const loadFeeds = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/feeds/')
      const data = await response.json()
      // Extract only feed-specific data
      const feedData = data.map((feed: any) => ({
        feed_url: feed.feed_url,
        label: feed.label,
        source: feed.source || '',
        language: feed.language || '',
        topic_default: feed.topic_default,
        enabled: feed.enabled
      }))
      setFeeds(feedData)
    } catch (error) {
      setMessage(`❌ Failed to load feeds: ${error}`)
    }
  }

  const loadGlobalRules = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/config/')
      const config = await response.json()
      setGlobalRules({
        include_any: config.defaults.include_any || [],
        include_all: config.defaults.include_all || [],
        exclude_any: config.defaults.exclude_any || [],
        min_words: config.defaults.min_words || 200,
        max_age_days: config.defaults.max_age_days || 10,
        language: config.defaults.language || '',
        source_weight: config.defaults.source_weight || 1.0
      })
    } catch (error) {
      console.error('Failed to load global rules:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/feeds/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const result = await response.json()
        setMessage(`✅ Successfully uploaded ${result.count} feeds`)
        loadFeeds() // Reload feeds
      } else {
        const error = await response.text()
        setMessage(`❌ Upload failed: ${error}`)
      }
    } catch (error) {
      setMessage(`❌ Upload failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const updateFeed = async (index: number, field: keyof FeedRule, value: any) => {
    const updatedFeeds = [...feeds]
    updatedFeeds[index] = { ...updatedFeeds[index], [field]: value }
    setFeeds(updatedFeeds)
  }

  const updateGlobalRule = (field: keyof GlobalRules, value: any) => {
    setGlobalRules({ ...globalRules, [field]: value })
  }

  const saveAll = async () => {
    setIsLoading(true)
    try {
      // First save global rules to config defaults
      const configResponse = await fetch('http://localhost:8000/api/config/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_words: globalRules.min_words,
          max_age_days: globalRules.max_age_days,
          language: globalRules.language,
          include_any: globalRules.include_any.join(','),
          include_all: globalRules.include_all.join(','),
          exclude_any: globalRules.exclude_any.join(',')
        }),
      })

      if (!configResponse.ok) {
        throw new Error('Failed to save global rules')
      }

      // Then save feeds with global rules applied
      const feedsWithRules = feeds.map(feed => ({
        ...feed,
        include_any: globalRules.include_any,
        include_all: globalRules.include_all,
        exclude_any: globalRules.exclude_any,
        min_words: globalRules.min_words,
        max_age_days: globalRules.max_age_days,
        language: globalRules.language,
        source_weight: globalRules.source_weight
      }))

      const feedsResponse = await fetch('http://localhost:8000/api/config/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: feedsWithRules }),
      })
      
      if (feedsResponse.ok) {
        setMessage('✅ All settings saved successfully')
      } else {
        setMessage('❌ Save failed')
      }
    } catch (error) {
      setMessage(`❌ Save failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewFeed = () => {
    const newFeed: FeedRule = {
      feed_url: '',
      label: '',
      source: '',
      language: '',
      topic_default: 'Generativ AI',
      enabled: true
    }
    setFeeds([...feeds, newFeed])
  }

  const deleteFeed = (index: number) => {
    const updatedFeeds = feeds.filter((_, i) => i !== index)
    setFeeds(updatedFeeds)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Feeds</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Ladda upp Excel</h2>
        <p className="mb-4">
          Din Excel ska ha dessa kolumner:
        </p>
        <ul className="list-disc list-inside mb-4 text-sm text-gray-600">
          <li><strong>Källa</strong> → feed_url</li>
          <li><strong>Beskrivning</strong> → label</li>
          <li><strong>RSS URL</strong> → feed_url (samma som Källa)</li>
          <li><strong>Språk</strong> → language</li>
        </ul>
        
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Global Rules Section */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Globala regler (gäller alla feeds)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min ord</label>
            <input
              type="number"
              value={globalRules.min_words}
              onChange={(e) => updateGlobalRule('min_words', parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max ålder (dagar)</label>
            <input
              type="number"
              value={globalRules.max_age_days}
              onChange={(e) => updateGlobalRule('max_age_days', parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Språk</label>
            <input
              type="text"
              value={globalRules.language}
              onChange={(e) => updateGlobalRule('language', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="sv, en, eller tom"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Källvikt (0.0-2.0)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={globalRules.source_weight}
              onChange={(e) => updateGlobalRule('source_weight', parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Inkludera någon av (kommaseparerat)</label>
            <input
              type="text"
              value={globalRules.include_any.join(', ')}
              onChange={(e) => updateGlobalRule('include_any', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full p-2 border rounded"
              placeholder="AI, machine learning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Inkludera alla (kommaseparerat)</label>
            <input
              type="text"
              value={globalRules.include_all.join(', ')}
              onChange={(e) => updateGlobalRule('include_all', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full p-2 border rounded"
              placeholder="artificial intelligence"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exkludera någon av (kommaseparerat)</label>
            <input
              type="text"
              value={globalRules.exclude_any.join(', ')}
              onChange={(e) => updateGlobalRule('exclude_any', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full p-2 border rounded"
              placeholder="sponsor, advertisement"
            />
          </div>
        </div>
      </div>

      {/* Feed Management */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Feeds ({feeds.length})</h2>
          <div className="space-x-2">
            <button
              onClick={addNewFeed}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + Lägg till feed
            </button>
            <button
              onClick={saveAll}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Sparar...' : 'Spara alla'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {feeds.map((feed, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium">
                  {feed.label || `Feed ${index + 1}`}
                </h3>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={feed.enabled}
                      onChange={(e) => updateFeed(index, 'enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Aktiverad
                  </label>
                  <button
                    onClick={() => deleteFeed(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">RSS URL</label>
                  <input
                    type="text"
                    value={feed.feed_url}
                    onChange={(e) => updateFeed(index, 'feed_url', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/rss"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Beskrivning</label>
                  <input
                    type="text"
                    value={feed.label}
                    onChange={(e) => updateFeed(index, 'label', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Feed beskrivning"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Källa</label>
                  <input
                    type="text"
                    value={feed.source}
                    onChange={(e) => updateFeed(index, 'source', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Källnamn"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Språk</label>
                  <input
                    type="text"
                    value={feed.language}
                    onChange={(e) => updateFeed(index, 'language', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="sv, en, etc."
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Standardämne</label>
                    <select
                      value={feed.topic_default}
                      onChange={(e) => updateFeed(index, 'topic_default', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="SEO & AI visibility">SEO & AI visibility</option>
                      <option value="Webbanalys & AI">Webbanalys & AI</option>
                      <option value="Generativ AI">Generativ AI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}