const requestLogger = (req, res, next) => {
    const start = Date.now();
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    console.log('[REQUEST BODY]', req.body);
    console.log('[REQUEST PARAMS]', req.params);
    console.log('[REQUEST QUERY]', req.query);

    // Add response logging
    const oldJson = res.json;
    res.json = function(data) {
        console.log('[RESPONSE]', {
            statusCode: res.statusCode,
            data: data
        });
        return oldJson.apply(res, arguments);
    };

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[RESPONSE FINISHED] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });

    next();
};

export default requestLogger;