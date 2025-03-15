export const formatTextWithMentions = (text) => {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
};

export const extractMentions = (text) => {
    const mentions = text.match(/@(\w+)/g) || [];
    return mentions.map(mention => mention.slice(1));
};
