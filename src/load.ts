import {
  CheerioOptions,
  InternalOptions,
  default as defaultOptions,
  flatten as flattenOptions,
} from './options';
import * as staticMethods from './static';
import { Cheerio } from './cheerio';
import { isHtml, isCheerio } from './utils';
import parse from './parse';
import type { Node, Document, Element } from 'domhandler';
import type * as Load from './load';
import { SelectorType, BasicAcceptedElems } from './types';

type LoadType = typeof Load;
type StaticType = typeof staticMethods;


/**
 * A querying function, bound to a document created from the provided markup.
 *
 * Also provides several helper methods for dealing with the document as a whole.
 */
export interface CheerioAPI extends StaticType, LoadType {
  /**
   * Added Comments
   * This selector method is the starting point for traversing and manipulating
   * the document. Like jQuery, it's the primary method for selecting elements
   * in the document.
   *
   * `selector` searches within the `context` scope which searches within the
   * `root` scope.
   *
   * @example
   *
   * ```js
   * $('.apple', '#fruits').text();
   * //=> Apple
   *
   * $('ul .pear').attr('class');
   * //=> pear
   *
   * $('li[class=orange]').html();
   * //=> Orange
   * ```
   *
   * @param selector - Either a selector to look for within the document, or the
   *   contents of a new Cheerio instance.
   * @param context - Either a selector to look for within the root, or the
   *   contents of the document to query.
   * @param root - Optional HTML document string.
   */
  <T extends Node, S extends string>(
    selector?: S | BasicAcceptedElems<T>,
    context?: BasicAcceptedElems<Node> | null,
    root?: BasicAcceptedElems<Document>,
    options?: CheerioOptions
  ): Cheerio<S extends SelectorType ? Element : T>;

  /**
   * The root the document was originally loaded with.
   *
   * @private
   */
  _root: Document;

  /**
   * The options the document was originally loaded with.
   *
   * @private
   */
  _options: InternalOptions;

  /** Mimic jQuery's prototype alias for plugin authors. */
  fn: typeof Cheerio.prototype;
}

/**
 * Create a querying function, bound to a document created from the provided
 * markup. Note that similar to web browser contexts, this operation may
 * introduce `<html>`, `<head>`, and `<body>` elements; set `isDocument` to
 * `false` to switch to fragment mode and disable this.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Allows parser to be switched to fragment mode.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
export function load(
  content: string | Node | Node[] | Buffer,
  options?: CheerioOptions | null,
  isDocument = true
): CheerioAPI {
  if ((content as string | null) == null) {
    throw new Error('cheerio.load() expects a string');
  }

  const internalOpts = { ...defaultOptions, ...flattenOptions(options) };
  const initialRoot = parse(content, internalOpts, isDocument);

  /** Create an extended class here, so that extensions only live on one instance. */
  class LoadedCheerio<T> extends Cheerio<T> {
    _make<T>(
      selector?: ArrayLike<T> | T | string,
      context?: BasicAcceptedElems<Node> | null
    ): Cheerio<T> {
      const cheerio = initialize(selector, context);
      cheerio.prevObject = this;

      return cheerio;
    }
  }

  function initialize<T = Node, S extends string = string>(
    selector?: ArrayLike<T> | T | S,
    context?: BasicAcceptedElems<Node> | null,
    root: BasicAcceptedElems<Document> = initialRoot,
    opts?: CheerioOptions
  ): Cheerio<S extends SelectorType ? Element : T> {
    type Result = S extends SelectorType ? Element : T;

    // $($)
    if (selector && isCheerio<Result>(selector)) return selector;

    const options = {
      ...internalOpts,
      ...flattenOptions(opts),
    };
    const r =
      typeof root === 'string'
        ? [parse(root, options, false)]
        : 'length' in root
        ? root
        : [root];
    const rootInstance = isCheerio<Document>(r)
      ? r
      : new LoadedCheerio<Document>(r, null, options);
    // Add a cyclic reference, so that calling methods on `_root` never fails.
    rootInstance._root = rootInstance;

    // $(), $(null), $(undefined), $(false)
    if (!selector) {
      return new LoadedCheerio<Result>(undefined, rootInstance, options);
    }

    const elements: Node[] | undefined =
      typeof selector === 'string' && isHtml(selector)
        ? // $(<html>)
          parse(selector, options, false).children
        : isNode(selector)
        ? // $(dom)
          [selector]
        : Array.isArray(selector)
        ? // $([dom])
          selector
        : undefined;

    const instance = new LoadedCheerio(elements, rootInstance, options);

    if (elements || !selector) {
      return instance as any;
    }

    if (typeof selector !== 'string') throw new Error('');

    // We know that our selector is a string now.
    let search = selector;

    const searchContext: Cheerio<Node> | undefined = !context
      ? // If we don't have a context, maybe we have a root, from loading
        rootInstance
      : typeof context === 'string'
      ? isHtml(context)
        ? // $('li', '<ul>...</ul>')
          new LoadedCheerio<Document>(
            [parse(context, options, false)],
            rootInstance,
            options
          )
        : // $('li', 'ul')
          ((search = `${context} ${search}` as S), rootInstance)
      : isCheerio<Node>(context)
      ? // $('li', $)
        context
      : // $('li', node), $('li', [nodes])
        new LoadedCheerio<Node>(
          Array.isArray(context) ? context : [context],
          rootInstance,
          options
        );

    // If we still don't have a context, return
    if (!searchContext) return instance as any;

    /*
     * #id, .class, tag
     */
    return searchContext.find(search) as Cheerio<Result>;
  }

  // Add in static methods & properties
  Object.assign(initialize, staticMethods, {
    load,
    // `_root` and `_options` are used in static methods.
    _root: initialRoot,
    _options: internalOpts,
    // Add `fn` for plugins
    fn: LoadedCheerio.prototype,
    // Add the prototype here to maintain `instanceof` behavior.
    prototype: LoadedCheerio.prototype,
  });

  return initialize as CheerioAPI;
}

function isNode(obj: any): obj is Node {
  return (
    !!obj.name ||
    obj.type === 'root' ||
    obj.type === 'text' ||
    obj.type === 'comment'
  );
}
