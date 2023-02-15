import Provider from "oidc-provider";
import configuration from "../support/configuration.js";
import crypto from "node:crypto";
import helmet from "helmet";
import {promisify} from "node:util";

export default () => {
    let adapter;
    const provider = new Provider(process.env.ISSUER, { adapter, ...configuration });
    provider.proxy = true
    provider.use(async (ctx, next) => {
        const origSecure = ctx.req.secure;
        ctx.req.secure = ctx.request.secure;
        // eslint-disable-next-line no-unused-expressions
        ctx.res.locals ||= {};
        ctx.res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
        await pHelmet(ctx.req, ctx.res);
        ctx.req.secure = origSecure;
        return next();
    });

    const directives = helmet.contentSecurityPolicy.getDefaultDirectives();
    delete directives['form-action'];
    directives['script-src'] = ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`];
    const pHelmet = promisify(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives,
        },
    }));

    return provider
}
