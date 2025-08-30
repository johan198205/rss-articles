'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, CheckCircle, Key, TestTube, Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink, Database, Settings } from 'lucide-react'

interface Config {
  model: string
}

interface SecretStatus {
  openai_set: boolean
  openai_last4: string | null
  notion_set: boolean
  notion_last4: string | null
  notion_database_id_set: boolean
  notion_database_id_last4: string | null
}

// Available OpenAI models
const OPENAI_MODELS = [
  { 
    value: "gpt-4o", 
    label: "GPT-4o (Latest)", 
    description: "Senaste modellen - bästa prestanda men dyrare"
  },
  { 
    value: "gpt-4o-mini", 
    label: "GPT-4o Mini (Recommended)", 
    description: "Optimal balans mellan prestanda och kostnad"
  },
  { 
    value: "gpt-4-turbo", 
    label: "GPT-4 Turbo", 
    description: "Snabb och kraftfull för komplexa uppgifter"
  },
  { 
    value: "gpt-4", 
    label: "GPT-4", 
    description: "Klassisk GPT-4 - mycket bra kvalitet"
  },
  { 
    value: "gpt-3.5-turbo", 
    label: "GPT-3.5 Turbo", 
    description: "Snabb och billig för enkla uppgifter"
  },
  { 
    value: "gpt-3.5-turbo-16k", 
    label: "GPT-3.5 Turbo 16K", 
    description: "GPT-3.5 med längre kontext (16k tokens)"
  },
]

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [secretStatus, setSecretStatus] = useState<SecretStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showNotionGuide, setShowNotionGuide] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    notion: '',
    notion_database_id: ''
  })
  const [showKeys, setShowKeys] = useState({
    openai: false,
    notion: false,
    notion_database_id: false
  })

  useEffect(() => {
    loadConfig()
    loadSecretStatus()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/config/')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const loadSecretStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/secrets/meta')
      const data = await response.json()
      setSecretStatus(data)
    } catch (error) {
      console.error('Failed to load secret status:', error)
    }
  }

  const setSecret = async (key: 'openai' | 'notion' | 'notion_database_id') => {
    if (!apiKeys[key]) {
      setMessage(`❌ ${key.toUpperCase()} API-nyckel saknas`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/secrets/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: apiKeys[key] }),
      })

      if (response.ok) {
        setMessage(`✅ ${key.toUpperCase()} API-nyckel sparad`)
        setApiKeys(prev => ({ ...prev, [key]: '' }))
        loadSecretStatus()
      } else {
        const error = await response.text()
        setMessage(`❌ Sparning misslyckades: ${error}`)
      }
    } catch (error) {
      setMessage(`❌ Sparning misslyckades: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testSecret = async (key: 'openai' | 'notion' | 'notion_database_id') => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/secrets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })

      const result = await response.json()
      if (result.ok) {
        setMessage(`✅ ${key.toUpperCase()} anslutning lyckades: ${result.message}`)
      } else {
        setMessage(`❌ ${key.toUpperCase()} test misslyckades: ${result.message}`)
      }
    } catch (error) {
      setMessage(`❌ Test misslyckades: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!config) return
    
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/config/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
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
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API-nycklar
          </CardTitle>
          <CardDescription>
            Ange dina API-nycklar för OpenAI och Notion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label>OpenAI API-nyckel</Label>
            <div className="flex gap-2">
              <Input
                type={showKeys.openai ? "text" : "password"}
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                placeholder="sk-..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
              >
                {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setSecret('openai')}
                disabled={isLoading || !apiKeys.openai}
                size="sm"
              >
                Spara
              </Button>
              <Button
                variant="outline"
                onClick={() => testSecret('openai')}
                disabled={isLoading || !secretStatus?.openai_set}
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-1" />
                Testa
              </Button>
            </div>
            {secretStatus?.openai_set && (
              <p className="text-sm text-green-600">
                ✅ Sparad: ...{secretStatus.openai_last4}
              </p>
            )}
          </div>

          {/* Notion API Key */}
          <div className="space-y-2">
            <Label>Notion API-nyckel</Label>
            <div className="flex gap-2">
              <Input
                type={showKeys.notion ? "text" : "password"}
                value={apiKeys.notion}
                onChange={(e) => setApiKeys(prev => ({ ...prev, notion: e.target.value }))}
                placeholder="secret_..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(prev => ({ ...prev, notion: !prev.notion }))}
              >
                {showKeys.notion ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setSecret('notion')}
                disabled={isLoading || !apiKeys.notion}
                size="sm"
              >
                Spara
              </Button>
              <Button
                variant="outline"
                onClick={() => testSecret('notion')}
                disabled={isLoading || !secretStatus?.notion_set}
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-1" />
                Testa
              </Button>
            </div>
            {secretStatus?.notion_set && (
              <p className="text-sm text-green-600">
                ✅ Sparad: ...{secretStatus.notion_last4}
              </p>
            )}
          </div>

          {/* Notion Database ID */}
          <div className="space-y-2">
            <Label>Notion Database ID</Label>
            <div className="flex gap-2">
              <Input
                type={showKeys.notion_database_id ? "text" : "password"}
                value={apiKeys.notion_database_id}
                onChange={(e) => setApiKeys(prev => ({ ...prev, notion_database_id: e.target.value }))}
                placeholder="32-character database ID"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(prev => ({ ...prev, notion_database_id: !prev.notion_database_id }))}
              >
                {showKeys.notion_database_id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setSecret('notion_database_id')}
                disabled={isLoading || !apiKeys.notion_database_id}
                size="sm"
              >
                Spara
              </Button>
              <Button
                variant="outline"
                onClick={() => testSecret('notion_database_id')}
                disabled={isLoading || !secretStatus?.notion_database_id_set}
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-1" />
                Testa
              </Button>
            </div>
            {secretStatus?.notion_database_id_set && (
              <p className="text-sm text-green-600">
                ✅ Sparad: ...{secretStatus.notion_database_id_last4}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notion Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowNotionGuide(!showNotionGuide)}
          >
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              📚 Steg-för-steg: Notion-konfiguration
            </div>
            {showNotionGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
          <CardDescription>
            Detaljerad guide för att konfigurera Notion API och databas
          </CardDescription>
        </CardHeader>
        {showNotionGuide && (
          <CardContent className="space-y-6">
            {/* Step 1: Create Notion Integration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Skapa Notion Integration
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm">
                  1. Gå till <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Notion My Integrations <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
                <p className="text-sm">2. Klicka på <strong>"New integration"</strong></p>
                <p className="text-sm">3. Ge den ett namn (t.ex. "RSS Articles")</p>
                <p className="text-sm">4. Välj din workspace</p>
                <p className="text-sm">5. Klicka <strong>"Submit"</strong></p>
                <p className="text-sm">6. Kopiera <strong>"Internal Integration Token"</strong> (börjar med "secret_")</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                  ⚠️ <strong>Viktigt:</strong> Spara denna token säkert - den visas bara en gång!
                </div>
              </div>
            </div>

            {/* Step 2: Create Database */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Skapa Notion-databas
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm">1. Skapa en ny sida i Notion</p>
                <p className="text-sm">2. Lägg till en databas (Table)</p>
                <p className="text-sm">3. Skapa följande kolumner:</p>
                <div className="ml-4 bg-gray-50 p-3 rounded text-sm font-mono">
                  <div><strong>Titel</strong> (Title) - Artikelns titel</div>
                  <div><strong>Källa</strong> (Text) - RSS-feedens namn</div>
                  <div><strong>URL</strong> (URL) - Länk till originalartikel</div>
                  <div><strong>Publicerad</strong> (Date) - Publiceringsdatum</div>
                  <div><strong>Vikt</strong> (Number) - AI-betyg (1-5)</div>
                  <div><strong>LinkedIn-artikel</strong> (Text) - Genererad artikel</div>
                  <div><strong>LinkedIn-post</strong> (Text) - Genererat inlägg</div>
                  <div><strong>Status</strong> (Select) - Processed, Published, etc.</div>
                </div>
              </div>
            </div>

            {/* Step 3: Share Database */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Dela databas med integration
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm">1. Klicka på <strong>"Share"</strong> i övre högra hörnet</p>
                <p className="text-sm">2. Sök efter din integration (t.ex. "RSS Articles")</p>
                <p className="text-sm">3. Klicka <strong>"Invite"</strong></p>
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                  🚨 <strong>Kritiskt:</strong> Utan detta steg kan inte appen komma åt databasen!
                </div>
              </div>
            </div>

            {/* Step 4: Get Database ID */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                Hitta Database ID
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm">1. Kopiera URL:en till din databas</p>
                <p className="text-sm">2. URL:en ser ut så här:</p>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                  https://www.notion.so/workspace/DatabaseName-<span className="bg-yellow-200">a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6</span>?v=...
                </div>
                <p className="text-sm">3. Database ID är den <span className="bg-yellow-200 px-1">gul-markerade delen</span> (32 tecken)</p>
                <p className="text-sm">4. Ta bort bindestreck om det finns några</p>
                <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
                  ✅ <strong>Exempel:</strong> a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                </div>
              </div>
            </div>

            {/* Step 5: Test Configuration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                Testa konfigurationen
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm">1. Klistra in <strong>Notion API-nyckeln</strong> ovan och klicka "Spara"</p>
                <p className="text-sm">2. Klistra in <strong>Database ID</strong> ovan och klicka "Spara"</p>
                <p className="text-sm">3. Klicka <strong>"Testa"</strong> för båda för att verifiera anslutningen</p>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                  💡 <strong>Tips:</strong> Om testet misslyckas, kontrollera att du delat databasen med din integration!
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-500" />
                Felsökning
              </h3>
              <div className="space-y-2 text-sm">
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <strong>❌ "API token is invalid"</strong><br/>
                  Kontrollera att API-nyckeln börjar med "secret_" och är korrekt kopierad.
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <strong>❌ "Object not found"</strong><br/>
                  Database ID är fel eller databasen är inte delad med integrationen.
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <strong>❌ "Insufficient permissions"</strong><br/>
                  Integrationen har inte rätt behörigheter. Dela databasen på nytt.
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modell</CardTitle>
          <CardDescription>
            OpenAI-modell som ska användas för klassificering och innehållsgenerering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={config.model} onValueChange={(value) => updateConfig('model', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Välj modell" />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Show current model info */}
          {config.model && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                Vald modell: {OPENAI_MODELS.find(m => m.value === config.model)?.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {OPENAI_MODELS.find(m => m.value === config.model)?.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle>Systeminformation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Tidszon: Europe/Stockholm (skrivskyddad)</p>
            <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Inställningar vs Feed-regler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-semibold text-green-800 mb-2">🎯 Inställningar (denna sida)</h4>
              <ul className="text-green-700 space-y-1">
                <li>• <strong>API-nycklar:</strong> Anslutningar till OpenAI och Notion</li>
                <li>• <strong>Modell:</strong> Vilken AI-modell som ska användas</li>
              </ul>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-semibold text-blue-800 mb-2">🌐 Feed-regler (Feeds-sidan)</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• <strong>Globala regler:</strong> Gäller ALLA feeds (vikt-tröskel, min ord, max ålder, språk, etc.)</li>
                <li>• <strong>Individuella feed-regler:</strong> Specifika inställningar per feed</li>
                <li>• <strong>Inkludera/Exkludera:</strong> Nyckelord som filtrerar artiklar</li>
              </ul>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="font-semibold text-yellow-800 mb-2">⚡ Hur det fungerar</h4>
              <p className="text-yellow-700">
                Alla regler hanteras på <strong>Feeds-sidan</strong>. 
                Först tillämpas <strong>globala regler</strong>, sedan <strong>individuella feed-regler</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

