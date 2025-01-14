import { assert } from 'chai';
import {
    dedupe,
    drop,
    dropWhile,
    filter,
    find,
    first,
    intoArray,
    last,
    map,
    reduce,
    reject,
    scan,
    sort,
    take,
    takeWhile,
    windowed,
    zip
} from "../src/transducers";
import { range, repeat } from "../src/sequence";
import { sum } from "../src/numbers";
import { assertSync } from "./collections.test";
import { array, ascending, by, Comparator, comparators, descending } from "../src/collections";
import { characters } from "../src/characters";


describe("Transducer", () => {
    it("can drop", () => {
        assertSync(drop(2).sync([1, 2, 3]), 3);
        assertSync(drop(4).sync([1, 2, 3]), ...[]);
    });

    it("can dropWhile", () => {
        assertSync(dropWhile((a) => a <= 2).sync([1, 2, 3, 2, 1]), 3, 2, 1);
        assertSync(dropWhile((a) => a < 4).sync([1, 2, 3, 2, 1]), ...[]);
    });

    it("can zip", () => {
        assertSync(zip(['a', 'b', 'c']).sync([1, 2]), [1, 'a'], [2, 'b']);
    });

    it("can map", () => {
        assertSync(map(n => n.toString()).sync([2]), "2");
    });

    it("can filter", () => {
        assertSync(filter<number>(n => n % 2 == 0).sync([0, 1, 2, 3, 4]), 0, 2, 4);
    });

    it("can reject", () => {
        assertSync(reject<number>(n => n % 2 == 0).sync([0, 1, 2, 3, 4]), 1, 3);
    });

    it("supports first", () => {
        assertSync(first().sync([]));
        assertSync(first().sync([0, 1, 2, 3, 4]), 0);
    });

    it("supports last", () => {
        assertSync(last().sync([]));
        assertSync(last().sync([0, 1, 2, 3, 4]), 4);
    });

    it("can find", () => {
        assertSync(find(n => n > 2).sync([0, 1, 2, 3, 4]), 3);
        assertSync(find(n => n > 2).sync([]));
    });

    it("can scan", () => {
        assertSync(scan(sum).sync([0, 2, 4]), 0, 2, 6);
    });

    it("can reduce", () => {
        assertSync(reduce(sum).sync([0, 2, 4]), 6);
    });

    it("can reduce to array", () => {
        assertSync(reduce(intoArray<number>()).sync([0, 2, 4]), [0, 2, 4]);
    });

    it("can take", () => {
        assertSync(take(4).sync([0, 1, 2, 3, 4, 5, 6, 7, 8]), 0, 1, 2, 3);
        assertSync(take(4.5).sync([0, 1, 2, 3, 4, 5, 6, 7, 8]), 0, 1, 2, 3);
        assertSync(take(0).sync([0, 1, 2, 3, 4, 5, 6, 7, 8]));
        assertSync(take(-1).sync([0, 1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it("can take while", async () => {
        assertSync(takeWhile(n => n < 4).sync([0, 1, 2, 3, 4, 5, 6, 7, 8]), 0, 1, 2, 3);
    });

    it("can sort", async () => {
        assertSync(sort().sync([3, 4, 8, 1, 2, 0, 3, 2, 9]), 0, 1, 2, 2, 3, 3, 4, 8, 9);
        assertSync(sort(ascending).sync([3, 4, 8, 1, 2, 0, 3, 2, 9]), 0, 1, 2, 2, 3, 3, 4, 8, 9);
        assertSync(sort(descending).sync([3, 4, 8, 1, 2, 0, 3, 2, 9]), 9, 8, 4, 3, 3, 2, 2, 1, 0);
    });

    it("supports a sliding window on infinite sequence", function () {
        assert.deepEqual(array(range(1), windowed(3), take(3)), [[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it("supports a sliding window on infinite sequence with custom step function", function () {
        assert.deepEqual(array(range(1), windowed(3, 1), take(3)), [[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
        assert.deepEqual(array(range(1), windowed(3, 2), take(3)), [[1, 2, 3], [3, 4, 5], [5, 6, 7]]);
        assert.deepEqual(array(range(1), windowed(3, 3), take(3)), [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    });

    it("supports a sliding window on infinite sequence with custom step function that is greater than the size", function () {
        assert.deepEqual(array(range(1), windowed(3, 4), take(3)), [[1, 2, 3], [5, 6, 7], [9, 10, 11]]);
    });

    it("can sort by property of object", async () => {
        class Cat {
            constructor(public name: string, public age: number) {
            }
        }

        const freaky = new Cat('Freaky', 17);
        const fatty = new Cat('Fatty', 18);
        const cats = [freaky, fatty];

        const comparator: Comparator<Cat> = by('name');
        assertSync(sort<Cat>(comparator).sync(cats), fatty, freaky);
        assertSync(sort<Cat>(by('name', ascending)).sync(cats), fatty, freaky);
        assertSync(sort<Cat>(by('name', descending)).sync(cats), freaky, fatty);
        assertSync(sort<Cat>(by('age')).sync(cats), freaky, fatty);
        assertSync(sort<Cat>(by('age', ascending)).sync(cats), freaky, fatty);
        assertSync(sort<Cat>(by('age', descending)).sync(cats), fatty, freaky);
    });

    it("can sort by two properties of the same object", async () => {
        class Cat {
            constructor(public name: string, public age: number) {
            }
        }

        const freaky = new Cat('Freaky', 17);
        const freakyClone = new Cat('Freaky', 16);
        const fatty = new Cat('Fatty', 17);
        const cats = [freaky, freakyClone, fatty];

        assertSync(sort<Cat>(comparators(by('age'), by('name'))).sync(cats), freakyClone, fatty, freaky);
    });

    it("can dedupe consecutive duplicates ", async () => {
        assertSync(dedupe<string>().sync(characters("Leeeeroy")), 'L','e','r','o','y');
    });

    it("supports terminating early with take", async () => {
        let called = false;
        assertSync(take(0).sync(repeat(() => {
            called = true;
            throw new Error();
        })));
        assert.equal(called, false);
    });

    // it("can decompose transducers", async () => {
    //     const composite = map(increment).filter(n => n % 2 == 0).scan(sum).take(4);
    //     const [identity, map, filter, scan, take] = composite.decompose();
    //     assert.instanceOf(identity, IdentityTransducer);
    //     assert.instanceOf(map, MapTransducer);
    //     assert.instanceOf(filter, FilterTransducer);
    //     assert.instanceOf(scan, ScanTransducer);
    //     assert.instanceOf(take, TakeTransducer);
    // });
});