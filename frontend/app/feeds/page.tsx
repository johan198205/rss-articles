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
  importance_threshold: number
}

interface GlobalRulesRaw {
  include_any: string
  include_all: string
  exclude_any: string
  min_words: number
  max_age_days: number
  language: string
  source_weight: number
  importance_threshold: number
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
    source_weight: 1.0,
    importance_threshold: 3.0
  })
  const [globalRulesRaw, setGlobalRulesRaw] = useState<GlobalRulesRaw>({
    include_any: '',
    include_all: '',
    exclude_any: '',
    min_words: 200,
    max_age_days: 10,
    language: '',
    source_weight: 1.0,
    importance_threshold: 3.0
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
      
      // Handle both array and string formats for backwards compatibility
      const include_any = Array.isArray(config.defaults.include_any) 
        ? config.defaults.include_any 
        : (config.defaults.include_any || '').split(',').map(s => s.trim()).filter(Boolean)
      
      const include_all = Array.isArray(config.defaults.include_all) 
        ? config.defaults.include_all 
        : (config.defaults.include_all || '').split(',').map(s => s.trim()).filter(Boolean)
      
      const exclude_any = Array.isArray(config.defaults.exclude_any) 
        ? config.defaults.exclude_any 
        : (config.defaults.exclude_any || '').split(',').map(s => s.trim()).filter(Boolean)
      
      const rules = {
        include_any,
        include_all,
        exclude_any,
        min_words: config.defaults.min_words || 200,
        max_age_days: config.defaults.max_age_days || 10,
        language: config.defaults.language || '',
        source_weight: config.defaults.source_weight || 1.0,
        importance_threshold: config.threshold?.importance || 3.0
      }
      
      setGlobalRules(rules)
      setGlobalRulesRaw({
        include_any: rules.include_any.join(', '),
        include_all: rules.include_all.join(', '),
        exclude_any: rules.exclude_any.join(', '),
        min_words: rules.min_words,
        max_age_days: rules.max_age_days,
        language: rules.language,
        source_weight: rules.source_weight,
        importance_threshold: rules.importance_threshold
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

  const updateGlobalRuleRaw = (field: keyof GlobalRulesRaw, value: any) => {
    setGlobalRulesRaw({ ...globalRulesRaw, [field]: value })
  }

  const processCommaField = (field: 'include_any' | 'include_all' | 'exclude_any') => {
    const rawValue = globalRulesRaw[field]
    const processed = rawValue.split(',').map(s => s.trim()).filter(Boolean)
    updateGlobalRule(field, processed)
  }

  const saveAll = async () => {
    setIsLoading(true)
    try {
      const globalRulesPayload = {
        min_words: globalRules.min_words,
        max_age_days: globalRules.max_age_days,
        language: globalRules.language,
        include_any: globalRules.include_any.length > 0 ? globalRules.include_any.join(',') : '',
        include_all: globalRules.include_all.length > 0 ? globalRules.include_all.join(',') : '',
        exclude_any: globalRules.exclude_any.length > 0 ? globalRules.exclude_any.join(',') : '',
        importance_threshold: globalRules.importance_threshold
      }
      

      
      // First save global rules to config defaults
      const configResponse = await fetch('http://localhost:8000/api/config/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalRulesPayload),
      })

      if (!configResponse.ok) {
        const errorText = await configResponse.text()
        throw new Error(`Failed to save global rules: ${errorText}`)
      }

      // Then save feeds using the dedicated endpoint
      const feedsResponse = await fetch('http://localhost:8000/api/feeds/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeds),
      })
      
      if (feedsResponse.ok) {
        setMessage('✅ All settings saved successfully')
      } else {
        const errorText = await feedsResponse.text()
        setMessage(`❌ Save failed: ${errorText}`)
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
      <div className="mb-8 p-6 border rounded-lg bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">🌐 Globala regler</h2>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Gäller alla feeds</span>
        </div>
        
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>💡 Vad är globala regler?</strong> Dessa regler tillämpas på ALLA feeds och artiklar. 
            De fungerar som en extra filterlager ovanpå individuella feed-regler.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min ord (global)</label>
            <input
              type="number"
              value={globalRules.min_words}
              onChange={(e) => updateGlobalRule('min_words', parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-600 mt-1">Filtrerar bort korta artiklar</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max ålder (global)</label>
            <input
              type="number"
              value={globalRules.max_age_days}
              onChange={(e) => updateGlobalRule('max_age_days', parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-600 mt-1">Filtrerar bort gamla artiklar</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Språk (global)</label>
            <input
              type="text"
              value={globalRules.language}
              onChange={(e) => updateGlobalRule('language', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="sv, en, eller tom"
            />
            <p className="text-xs text-gray-600 mt-1">Filtrerar på språk</p>
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
            <p className="text-xs text-gray-600 mt-1">Vikt för källan</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Vikt-tröskel (0.0-5.0)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={globalRules.importance_threshold}
              onChange={(e) => updateGlobalRule('importance_threshold', parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-600 mt-1">Minsta vikt för att behålla artikel</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Inkludera någon av (kommaseparerat)</label>
            <input
              type="text"
              value={globalRulesRaw.include_any}
              onChange={(e) => updateGlobalRuleRaw('include_any', e.target.value)}
              onBlur={() => processCommaField('include_any')}
              className="w-full p-2 border rounded"
              placeholder="AI, machine learning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Inkludera alla (kommaseparerat)</label>
            <input
              type="text"
              value={globalRulesRaw.include_all}
              onChange={(e) => updateGlobalRuleRaw('include_all', e.target.value)}
              onBlur={() => processCommaField('include_all')}
              className="w-full p-2 border rounded"
              placeholder="artificial intelligence"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exkludera någon av (kommaseparerat)</label>
            <input
              type="text"
              value={globalRulesRaw.exclude_any}
              onChange={(e) => updateGlobalRuleRaw('exclude_any', e.target.value)}
              onBlur={() => processCommaField('exclude_any')}
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