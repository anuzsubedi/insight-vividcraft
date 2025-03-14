const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Add response logging
    const oldJson = res.json;
    res.json = function(data) {
        res.on('finish', () => {
            const duration = Date.now() - start;
        });
        return oldJson.apply(res, arguments);
    };

    next();
};

export default requestLogger;