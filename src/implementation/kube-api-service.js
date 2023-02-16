import {readFileSync} from "fs";
import * as k8s from "@kubernetes/client-node";
import Account from "../support/account.js";

export class KubeApiService {
    constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromOptions({
            clusters: [{
                name: 'codemowers',
                server: 'https://kube.codemowers.eu',
            }],
            users: [{
                name: 'oidc-gateway',
                token: readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token').toString(),
            }],
            contexts: [{
                name: 'codemowers',
                user: 'oidc-gateway',
                cluster: 'codemowers',
            }],
            currentContext: 'codemowers',
        });
        this.k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);
        this.group = "codemowers.io";
        this.version = "v1alpha1";
        this.plural = "oidcgatewayusers";
        this.namespace = 'veebkolm-gab7y';
    }

    async findUser(id) {
        return  await this.k8sApi.getNamespacedCustomObject(
            this.group,
            this.version,
            this.namespace,
            this.plural,
            id
        ).then((r) => {
            return new Account(r.body)
        }).catch((e) => {
            if (e.statusCode !== 404) {
                console.error(e)
                return null
            }
        })
    }

    async createUser(id, profile) {
        return await this.k8sApi.createNamespacedCustomObject(
            this.group,
            this.version,
            this.namespace,
            this.plural,
            {
                'apiVersion': 'codemowers.io/v1alpha1',
                'kind': 'OIDCGWUser',
                'metadata': {
                    'name': id,
                },
                'spec': {
                    'profile': profile
                }
            }
        ).then((r) => {
            console.error(r.body)
            return new Account(r.body)
        }).catch((e) => {
            if (e.statusCode !== 404) {
                console.error(e)
                return null
            }
        })
    }

    async updateUser(id, profile) {
        const patches = Object.keys(profile).map((k) => {
            return {
                "op": "replace",
                "path":"/spec/profile/" + k,
                "value": profile[k]
            }
        })

        return await this.k8sApi.patchNamespacedCustomObject(
            this.group,
            this.version,
            this.namespace,
            this.plural,
            id,
            patches,
            undefined,
            undefined,
            undefined,
            { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}}
        ).then((r) => {
            console.log(r.body)
            return new Account(r.body)
        }).catch((e) => {
            if (e.statusCode !== 404) {
                console.error(e)
                return null
            }
        })
    }
}
