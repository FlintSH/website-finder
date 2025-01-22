import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

let wordsCache: string[] | null = null;

export async function GET() {
  try {
    if (!wordsCache) {
      const filePath = path.join(process.cwd(), 'src/data/words.txt');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      wordsCache = fileContent.split('\n').filter(word => 
        word.trim().length >= 3 && word.trim().length <= 12
      );
    }

    const randomIndex = Math.floor(Math.random() * wordsCache.length);
    const word = wordsCache[randomIndex].trim();

    return NextResponse.json({ word });
  } catch (error) {
    console.error('Error getting random word:', error);
    return NextResponse.json(
      { error: 'Failed to get random word' },
      { status: 500 }
    );
  }
} 