export function interpolatePlaceholder(message: string, placeholder: unknown): string {
    if (!message.includes('{placeholder}')) return message;
    return message.replaceAll('{placeholder}', String(placeholder));
}
