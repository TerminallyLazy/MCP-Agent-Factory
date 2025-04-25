"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, File, X, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  buttonText?: string;
  dragActiveText?: string;
  dragInactiveText?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".json",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  buttonText = "Select File",
  dragActiveText = "Drop file here",
  dragInactiveText = "or drag and drop file here",
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file type
    if (accept && accept !== "*") {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const acceptedTypes = accept.split(',').map(type => type.trim().replace(".", "").toLowerCase());

      if (!fileExtension || !acceptedTypes.includes(fileExtension)) {
        setError(`File must be a ${accept} file`);
        return false;
      }
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      setError(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    setError(null);
    setSuccess(false);

    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
      setSuccess(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setSuccess(false);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-lg p-6 transition-all",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          error && "border-destructive bg-destructive/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm">
                <File className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {success && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                  <Check className="h-4 w-4" />
                  <span>File selected successfully</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <Button
                  variant="default"
                  onClick={handleButtonClick}
                  className="mb-2"
                >
                  {buttonText}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {dragActive ? dragActiveText : dragInactiveText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept} files only, max {maxSize / 1024 / 1024}MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 text-sm text-destructive mt-2"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
