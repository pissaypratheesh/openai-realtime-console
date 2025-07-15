#!/usr/bin/env node

// Simple test script to verify clipboard functionality
import { clipboard } from 'electron';

console.log('🧪 Testing Clipboard Functionality...\n');

try {
  // Test 1: Check available formats
  console.log('📋 Available clipboard formats:');
  const formats = clipboard.availableFormats();
  console.log('  ', formats.join(', '));
  
  // Test 2: Read text content
  console.log('\n📝 Current clipboard text:');
  const text = clipboard.readText();
  console.log('  ', text ? `"${text.substring(0, 100)}..."` : '(empty)');
  
  // Test 3: Test writing and reading
  console.log('\n✍️  Testing write/read:');
  const testText = 'Hello from clipboard test!';
  clipboard.writeText(testText);
  const readBack = clipboard.readText();
  console.log('  ', readBack === testText ? '✅ Success' : '❌ Failed');
  
  // Test 4: Check for file formats
  console.log('\n📁 Checking for file-related formats:');
  const fileFormats = formats.filter(format => 
    format.includes('file') || 
    format.includes('uri') || 
    format.includes('FileNameW') ||
    format.includes('public.file-url')
  );
  
  if (fileFormats.length > 0) {
    console.log('  ', '✅ File formats found:', fileFormats.join(', '));
  } else {
    console.log('  ', '⚠️  No file formats detected in clipboard');
  }
  
  console.log('\n🎉 Clipboard test completed!');
  
} catch (error) {
  console.error('❌ Error testing clipboard:', error.message);
} 