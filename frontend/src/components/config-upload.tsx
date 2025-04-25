"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, RefreshCw, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfigUploadProps {
  onConfigUpdated?: () => void;
}

export function ConfigUpload({ onConfigUpdated }: ConfigUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addedServers, setAddedServers] = useState<string[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadSuccess(false);
    setUploadError(null);
    setAddedServers([]);
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
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload MCP Configuration</CardTitle>
        <CardDescription>
          Upload a JSON file containing MCP server configurations to add them to your system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload
          onFileSelect={handleFileSelect}
          accept=".json"
          buttonText="Select Configuration File"
          dragActiveText="Drop your mcp_config.json file here"
          dragInactiveText="or drag and drop your mcp_config.json file here"
        />

        <AnimatePresence>
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4"
            >
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
            </motion.div>
          )}

          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
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
