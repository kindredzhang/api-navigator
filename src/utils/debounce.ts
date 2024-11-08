export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 300,
    immediate: boolean = false
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
    let timeout: NodeJS.Timeout | null = null;
    let result: ReturnType<T>;

    return async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
        const callNow = immediate && !timeout;

        if (timeout) {
            clearTimeout(timeout);
        }

        return new Promise((resolve) => {
            timeout = setTimeout(() => {
                timeout = null;
                if (!immediate) {
                    try {
                        result = func(...args);
                        resolve(result);
                    } catch (error) {
                        console.error('Debounced function error:', error);
                        resolve();
                    }
                }
            }, wait);

            if (callNow) {
                try {
                    result = func(...args);
                    resolve(result);
                } catch (error) {
                    console.error('Debounced function error:', error);
                    resolve();
                }
            }
        });
    };
} 