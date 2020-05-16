declare namespace $tw {
    interface tiddlerFields {
        title: string;
        [key: string]: any;
    }

    export class Tiddler {
        constructor(
            public fields: tiddlerFields | Tiddler,
            ...moreFields: Object
        );
    }

    export class Wiki {
        getTiddler(title: string): Tiddler;
        addTiddler(tiddler: Tiddler | tiddlerFields);
    }

    class RootWidget {
        dispatchEvent({ type: string, param: any });
    }

    let wiki: Wiki;
    let rootWidget: RootWidget;
    let utils: {
        each(Object, fn: (val: any, key: string) => void);
    };
}
