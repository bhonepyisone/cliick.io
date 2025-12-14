import { KeywordReply } from '../types';

type AutomationContext = 'chat' | 'comments';

export const findKeywordReply = (
    message: string, 
    keywordReplies: KeywordReply[],
    context: AutomationContext
): KeywordReply | null => {
    
    const lowerCaseMessage = message.trim().toLowerCase();

    for (const rule of keywordReplies) {
        // Skip disabled rules
        if (!rule.enabled) continue;

        // Default to 'contains' for backward compatibility with any old data
        const matchType = rule.matchType || 'contains';

        if (!rule.applyTo[context]) continue;

        const triggerPhrases = rule.keywords
            .split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => k);
            
        let isMatch = false;
        if (matchType === 'exact') {
            isMatch = triggerPhrases.some(phrase => lowerCaseMessage === phrase);
        } else { // 'contains'
            isMatch = triggerPhrases.some(phrase => lowerCaseMessage.includes(phrase));
        }

        if (isMatch) {
            return rule;
        }
    }
    return null;
};