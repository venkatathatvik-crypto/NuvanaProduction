import { Injectable, Logger } from '@nestjs/common';
import { franc } from 'franc-min';
import * as iso6393Data from 'iso-639-3';

/**
 * Language Detection Service for Multilingual PDF Support
 * 
 * Uses franc library for language detection and iso-639-3 for language name mapping
 */
@Injectable()
export class LanguageDetectorService {
    private readonly logger = new Logger(LanguageDetectorService.name);

    /**
     * Detect language of text content
     * @param text - Text to analyze
     * @returns Language information with ISO code and name
     */
    detectLanguage(text: string): {
        code: string;
        name: string;
        confidence: 'high' | 'medium' | 'low';
    } {
        if (!text || text.trim().length < 50) {
            this.logger.warn('Text too short for reliable language detection');
            return {
                code: 'und',
                name: 'Undetermined',
                confidence: 'low',
            };
        }

        try {
            // Use franc to detect language (returns ISO 639-3 code)
            const detectedCode = franc(text, { minLength: 50 });

            // Handle 'und' (undetermined) response
            if (detectedCode === 'und') {
                this.logger.warn('Could not determine language from text');
                return {
                    code: 'und',
                    name: 'Undetermined',
                    confidence: 'low',
                };
            }

            // Map ISO 639-3 code to language name
            // iso6393Data.iso6393 contains the array of language objects
            const languageInfo = (iso6393Data as any).iso6393?.find(
                (lang: any) => lang.iso6393 === detectedCode
            );
            const languageName = languageInfo?.name || 'Unknown';

            // Determine confidence based on text length
            let confidence: 'high' | 'medium' | 'low' = 'medium';
            if (text.length > 1000) {
                confidence = 'high';
            } else if (text.length < 200) {
                confidence = 'low';
            }

            this.logger.log(
                `Detected language: ${languageName} (${detectedCode}) with ${confidence} confidence`,
            );

            return {
                code: detectedCode,
                name: languageName,
                confidence,
            };
        } catch (error) {
            this.logger.error('Error detecting language:', error);
            return {
                code: 'und',
                name: 'Undetermined',
                confidence: 'low',
            };
        }
    }

    /**
     * Detect if text contains multiple languages
     * @param text - Text to analyze
     * @returns True if mixed languages detected
     */
    isMixedLanguage(text: string): boolean {
        if (!text || text.trim().length < 200) {
            return false;
        }

        try {
            // Split text into chunks and detect language for each
            const chunkSize = Math.floor(text.length / 4);
            const chunks = [
                text.substring(0, chunkSize),
                text.substring(chunkSize, chunkSize * 2),
                text.substring(chunkSize * 2, chunkSize * 3),
                text.substring(chunkSize * 3),
            ];

            const languages = new Set(
                chunks
                    .filter((chunk) => chunk.length > 50)
                    .map((chunk) => franc(chunk))
                    .filter((code) => code !== 'und'),
            );

            const isMixed = languages.size > 1;
            if (isMixed) {
                this.logger.log(`Mixed language document detected: ${Array.from(languages).join(', ')}`);
            }

            return isMixed;
        } catch (error) {
            this.logger.error('Error checking for mixed languages:', error);
            return false;
        }
    }

    /**
     * Get language-specific preprocessing recommendations
     * @param languageCode - ISO 639-3 language code
     * @returns Preprocessing recommendations
     */
    getPreprocessingRecommendations(languageCode: string): {
        requiresSpecialHandling: boolean;
        recommendations: string[];
    } {
        const specialHandlingLanguages = ['hin', 'ara', 'zho', 'jpn', 'kor', 'tha', 'tam', 'tel'];

        const requiresSpecialHandling = specialHandlingLanguages.includes(languageCode);

        const recommendations: string[] = [];

        if (requiresSpecialHandling) {
            recommendations.push('Use Unicode normalization');
            recommendations.push('Consider language-specific tokenization');
        }

        if (['ara', 'urd', 'fas'].includes(languageCode)) {
            recommendations.push('Right-to-left text detected');
        }

        if (['zho', 'jpn', 'kor'].includes(languageCode)) {
            recommendations.push('CJK text detected - no spaces between words');
        }

        if (['hin', 'tam', 'tel', 'ben', 'mar'].includes(languageCode)) {
            recommendations.push('Indic script detected - complex character composition');
        }

        return {
            requiresSpecialHandling,
            recommendations,
        };
    }
}
