import {assert} from 'chai';
import {handlerContract} from "../handler.contract";
import {HttpBinHandler} from "../httpbin";
import {Server} from "../api";
import {runningInNode} from "../totallylazy/node";

describe("NodeServerHandler", function () {
    const server = new Promise<Server>(async (resolve) => {
        const {NodeServerHandler} = await import('./server');
        resolve(new NodeServerHandler(new HttpBinHandler()));
    });

    before(async function () {
        if (!runningInNode()) this.skip();
    });

    async function host(): Promise<string> {
        const s = await server;
        const url = await s.url();
        if (url.authority) return url.authority;
        throw new Error("Should never get here");
    }

    handlerContract(async () => {
        if (!runningInNode()) throw new Error("Unsupported");

        const {NodeClientHandler} = await import('./clients');
        return new NodeClientHandler();
    }, host());

    after(async function () {
        try {
            (await server).close()
        } catch (ignore) {
        }
    });
});
