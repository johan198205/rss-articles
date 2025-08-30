'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, TestTube, CheckCircle, XCircle } from 'lucide-react'

interface SecretMeta {
  openai_set: boolean
  openai_last4?: string
  notion_set: boolean
  notion_last4?: string
}

export default function SecretsPage() {
  const [secretMeta, setSecretMeta] = useState<SecretMeta | null>(null)
  const [openaiKey, setOpenaiKey] = useState('')
  const [notionKey, setNotionKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [testResults, setTestResults] = useState<{[key: string]: {ok: boolean, message: string}}>({})

  useEffect(() => {
    loadSecretMeta()
  }, [])

  const loadSecretMeta = async () => {
    try {
      const response = await fetch('/api/secrets/meta')
      const data = await response.json()
      setSecretMeta(data)
    } catch (error) {
      console.error('Failed to load secret meta:', error)
    }
  }

  const saveSecret = async (key: 'openai' | 'notion', value: string) => {
    if (!value.trim()) {
      setMessage('Värdet får inte vara tomt')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/secrets/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await response.json()
      setSecretMeta(data)
      setMessage(`${key === 'openai' ? 'OpenAI' : 'Notion'} nyckel sparad`)
      
      // Clear input
      if (key === 'openai') setOpenaiKey('')
      if (key === 'notion') setNotionKey('')
    } catch (error) {
      setMessage('Sparning misslyckades')
    } finally {
      setIsLoading(false)
    }
  }

  const testSecret = async (key: 'openai' | 'notion') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/secrets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await response.json()
      setTestResults(prev => ({ ...prev, [key]: data }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [key]: { ok: false, message: 'Test misslyckades' }
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API-nycklar</h1>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OpenAI API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              OpenAI API Key
              {secretMeta && (
                <Badge variant={secretMeta.openai_set ? 'default' : 'secondary'}>
                  {secretMeta.openai_set ? 'Sparad' : 'Ej satt'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {secretMeta?.openai_set && secretMeta.openai_last4 && (
                <>Maskerad: ****...{secretMeta.openai_last4}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="openai-key">Ny API-nyckel</Label>
              <Input
                id="openai-key"
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => saveSecret('openai', openaiKey)}
                disabled={isLoading || !openaiKey.trim()}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Spara
              </Button>
              <Button 
                onClick={() => testSecret('openai')}
                disabled={isLoading || !secretMeta?.openai_set}
                variant="outline"
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Testa
              </Button>
            </div>
            {testResults.openai && (
              <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                testResults.openai.ok 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {testResults.openai.ok ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResults.openai.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notion API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Notion API Key
              {secretMeta && (
                <Badge variant={secretMeta.notion_set ? 'default' : 'secondary'}>
                  {secretMeta.notion_set ? 'Sparad' : 'Ej satt'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {secretMeta?.notion_set && secretMeta.notion_last4 && (
                <>Maskerad: ****...{secretMeta.notion_last4}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notion-key">Ny API-nyckel</Label>
              <Input
                id="notion-key"
                type="password"
                value={notionKey}
                onChange={(e) => setNotionKey(e.target.value)}
                placeholder="secret_..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => saveSecret('notion', notionKey)}
                disabled={isLoading || !notionKey.trim()}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Spara
              </Button>
              <Button 
                onClick={() => testSecret('notion')}
                disabled={isLoading || !secretMeta?.notion_set}
                variant="outline"
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Testa
              </Button>
            </div>
            {testResults.notion && (
              <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                testResults.notion.ok 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {testResults.notion.ok ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResults.notion.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruktioner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">OpenAI API Key</h4>
            <p className="text-sm text-muted-foreground">
              1. Gå till <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI API Keys</a><br/>
              2. Skapa en ny API-nyckel<br/>
              3. Klistra in nyckeln här och klicka "Spara"<br/>
              4. Testa anslutningen med "Testa"-knappen
            </p>
          </div>
          <div>
            <h4 className="font-medium">Notion API Key</h4>
            <p className="text-sm text-muted-foreground">
              1. Gå till <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">Notion Integrations</a><br/>
              2. Skapa en ny integration<br/>
              3. Kopiera "Internal Integration Token"<br/>
              4. Klistra in nyckeln här och klicka "Spara"<br/>
              5. Testa anslutningen med "Testa"-knappen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

