"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, RefreshCw, Upload } from "lucide-react";

interface SimpleFileUploadProps {
  onConfigUpdated?: () => void;
}

export function SimpleFileUpload({ onConfigUpdated }: SimpleFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addedServers, setAddedServers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadError(null);
      setAddedServers([]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      console.log("Uploading file:", selectedFile.name, "Size:", selectedFile.size);
      
      // Create a FormData instance
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Log the FormData contents for debugging
      console.log("FormData created with file:", selectedFile.name);
      
      // Make the API request
      console.log("Sending request to /api/config/upload");
      const response = await fetch("/api/config/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload configuration");
      }

      setUploadSuccess(true);
      setAddedServers(data.addedServers || []);
      
      // Call the callback if provided
      if (onConfigUpdated) {
        onConfigUpdated();
      }
    } catch (error) {
      console.error("Error uploading configuration:", error);
      setUploadError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    setUploadError(null);
    setAddedServers([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload MCP Configuration</CardTitle>
        <CardDescription>
          Upload a JSON file containing MCP server configurations to add them to your system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
          />
          
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <div className="flex-1">
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadSuccess && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertTitle className="text-green-800 dark:text-green-400">
              Configuration uploaded successfully
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-500">
              {addedServers.length > 0 ? (
                <>
                  <p>Added the following MCP servers:</p>
                  <ul className="list-disc list-inside mt-2">
                    {addedServers.map((server) => (
                      <li key={server}>{server}</li>
                    ))}
                  </ul>
                </>
              ) : (
                "Configuration has been updated."
              )}
            </AlertDescription>
          </Alert>
        )}

        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={resetForm}
          disabled={isUploading || (!selectedFile && !uploadSuccess && !uploadError)}
        >
          Reset
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || uploadSuccess}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isUploading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Configuration
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
