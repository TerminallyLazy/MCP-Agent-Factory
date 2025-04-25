"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, RefreshCw, Zap } from "lucide-react";

export function OpenAIStatus() {
  const [status, setStatus] = useState<'loading' | 'online' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Checking OpenAI API connection...');
  const [models, setModels] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    try {
      setIsChecking(true);
      setStatus('loading');
      setMessage('Checking OpenAI API connection...');

      const response = await fetch('/api/openai/status');
      const data = await response.json();

      if (response.ok) {
        setStatus(data.status);
        setMessage(data.message);
        if (data.models) {
          setModels(data.models);
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to check OpenAI API status');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  // Check status on component mount
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            OpenAI API Status
          </CardTitle>
          <Badge
            variant={status === 'online' ? 'default' : status === 'loading' ? 'secondary' : 'destructive'}
            className="px-2 py-1"
          >
            {status === 'loading' ? 'Checking...' : status.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          Connection status for the OpenAI API used by MCP agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'online' ? (
          <div className="space-y-2">
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
              <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertTitle className="text-green-800 dark:text-green-400">
                Connected to OpenAI API
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-500">
                {message}
              </AlertDescription>
            </Alert>
            
            {models.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Available Models:</h4>
                <div className="flex flex-wrap gap-2">
                  {models.map((model) => (
                    <Badge key={model} variant="outline" className="bg-background">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : status === 'error' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex justify-center py-4">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={checkStatus}
          disabled={isChecking}
          variant="outline"
          className="w-full"
        >
          {isChecking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Connection
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
