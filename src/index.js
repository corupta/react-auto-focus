import React from 'react';
import PropTypes from 'prop-types';
import AVLTree from 'avl';

const AutoFocusContext = React.create;

const orderShift = 10;

class AutoFocusContainer extends React.PureComponent {
  static propTypes = {
    skipToPrev: PropTypes.func,
    skipToNext: PropTypes.func,
    children: PropTypes.any,
    orderComparator: PropTypes.func,
    focusDefaultDirection: PropTypes.string.oneOf(['FORWARD', 'BACKWARD'])
  };
  constructor(props) {
    super(props);
    this.uidToFocus = new Map(); // uid => focus
    this.uidToOrder = new Map(); // uid => uid.order
    this.orderToUID = new Map(); // order => Map( innerOrder => uid )
    this.lastOrder = 0;
    this.orderTree = new AVLTree(this.props.orderComparator);
  }
  readOrder(orderProp) {
    if (orderProp) {
      const nextOrder = orderProp << orderShift; // eslint-disable-line no-bitwise
      if (this.orderToUID.has(nextOrder)) {
        throw new Error('Two elements in the same AutoFocusContainer cannot have the same autoFocusOrder prop.');
      }
      this.lastOrder = nextOrder;
    } else {
      ++this.lastOrder;
    }
    return this.lastOrder;
  }
  focus(direction) { // forward focus = left to right, backward focus = right to left
    if (typeof direction === 'undefined') {
      direction = this.props.focusDefaultDirection || 'FORWARD'; // eslint-disable-line no-param-reassign
    }
    let forward;
    switch (direction) {
      case 'NEXT':
      case true:
      case 1:
        console.warn('"NEXT", true and 1 for initialDirection may be deprecated later. Use "FORWARD" instead.');
      case 'FORWARD': // eslint-disable-line no-fallthrough
        forward = true;
        break;
      case 'PREV':
      case false:
      case 0:
        console.warn('"PREV", false and 0 for initialDirection may be deprecated later. Use "BACKWARD" instead.');
      case 'BACKWARD': // eslint-disable-line no-fallthrough
        forward = false;
        break;
      default:
        throw new Error('unknown initialDirection passed to focus, call it with "FORWARD" or "BACKWARD"');
    }
    let focus = null;
    if (this.uidToFocus.size) {
      let node;
      if (forward) {
        node = this.orderTree.minNode();
      } else {
        node = this.orderTree.maxNode();
      }
      const uid = node.data;
      focus = this.uidToFocus[uid];
      if (!focus) {
        if (forward) {
          focus = () => this.next(uid);
        } else {
          focus = () => this.prev(uid);
        }
      }
    } else if (forward) {
      focus = this.props.skipToNext;
    } else {
      focus = this.props.skipToPrev;
    }
    if (focus) {
      focus();
    }
  }

  find(uid) {
    const order = this.uidToOrder.get(uid);
    if (!order) {
      throw new Error(`Next/Prev called before subscribe: Maybe you tried to call next 
      from a component that is not mounted yet.`);
    }
    const currentNode = this.orderTree.find(order);
    if (!currentNode) {
      throw new Error(`Next/Prev called before subscribe-2: Maybe you tried to call next 
      from a component that is not mounted yet.`);
    }
    return currentNode;
  }
  next(uid) {
    const currentNode = this.find(uid);
    const nextNode = this.orderTree.next(currentNode);
    if (nextNode) {
      const nextUID = nextNode.data;
      const focus = this.uidToFocus(nextUID);
      if (!focus) {
        return this.next(nextUID);
      }
      focus();
      return () => this.next(nextUID);
    }
    if (this.props.next) {
      return this.props.next();
    }
    return null;
  }
  prev(uid) {
    const currentNode = this.find(uid);
    const prevNode = this.orderTree.prev(currentNode);
    if (prevNode) {
      const prevUID = prevNode.data;
      const focus = this.uidToFocus(prevUID);
      if (!focus) {
        return this.prev(prevUID);
      }
      focus();
      return () => this.prev(prevUID);
    }
    if (this.props.prev) {
      return this.props.prev();
    }
    return null;
  }
  subscribe(ref, focusExtractor, autoFocusOrder, uid) {
    if (ref) {
      const order = this.readOrder(autoFocusOrder);

      let focus = null;
      switch (typeof focusExtractor) {
        case 'function':
          focus = focusExtractor(ref).bind(ref);
          break;
        case 'string':
          focus = ref[focusExtractor].bind(ref);
          break;
        case 'undefined':
          // focus = ref.focus.bind(ref);
          console.warn(`focusExtractor in ${ref.constructor.name} is undefined, defaulting to skip focus, 
          *** DEFAULTS MAY CHANGE IN FUTURE *** So, use "null" instead to ensure skip focus.`);
      }
      if (focusExtractor && typeof focus !== 'function') {
        throw new Error('Focus extractor resulted in a non-function focus value.');
      }
      // if (focus) {
      this.uidToFocus.set(uid, focus);
      // }
      this.orderToUID.set(order, uid);
      this.uidToOrder.set(uid, order);
      this.orderTree.insert(order, uid);
    } else {
      this.uidToFocus.delete(uid);
      const order = this.uidToOrder.get(uid);
      if (this.uidToOrder.delete(uid)) {
        this.orderToUID.delete(order);
      }
    }
  }
  getContext() {
    if (!this.autoFocusContext) {
      this.autoFocusContext = {
        subscribe: this.subscribe,
        next: this.next,
        prev: this.prev
      };
    }
    return this.autoFocusContext;
  }
  render() {
    return (
      <AutoFocusContext.Provider
        value={ this.getContext() }
      >
        { this.props.children || null }
      </AutoFocusContext.Provider>
    );
  }
}

const AutoFocusContainerWithFocus = withAutoFocus('focus', ['skipToNext'], ['skipToPrev'])(AutoFocusContainer);

export { AutoFocusContainerWithFocus as AutoFocusContainer };


const nextUID = () => {
  return 'abc';
  // todo improve uid function
};

class UniqueIdProvider extends React.PureComponent {
  static propTypes = {
    next: PropTypes.func.isRequired,
    prev: PropTypes.func.isRequired,
    children: PropTypes.func
  };
  constructor(props) {
    super(props);
    this.uid = nextUID();
    this.next = this.next.bind(this);
  }
  next() {
    this.props.next(this.uid);
  }
  prev() {
    this.props.prev(this.uid);
  }
  render() {
    return this.props.children(this.uid, this.next, this.prev);
  }
}

const shallowEquals = (obj1, obj2) => {
  const obj1Keys = Object.keys(obj1).filter((key) => obj1.hasOwnProperty(key));
  const obj2Keys = Object.keys(obj2).filter((key) => obj2.hasOwnProperty(key));
  if (obj1Keys.length !== obj2Keys.length) {
    return false;
  }
  const allKeys = [...obj1Keys, ...obj2Keys];
  if (obj1Keys.length !== allKeys.length) {
    return false;
  }
  for (let i = 0; i < allKeys.length; ++i) {
    if (obj1[allKeys[i]] !== obj2[allKeys[i]]) {
      return false;
    }
  }
  return true;
};

export const withAutoFocus = (focusExtractor, nextPropNames = [], prevPropNames = []) => {
  const propsBuilder = (props, next, prev, uid) =>
    [
      ...nextPropNames.map((propName) => ({
        [propName]: (...args) => {
          next(uid);
          return props[propName] && props[propName](...args);
        }
      })),
      ...prevPropNames.map((propName) => ({
        [propName]: (...args) => {
          prev(uid);
          return props[propName] && props[propName](...args);
        }
      }))
      /* { [skipToNextPropName]: () => next(uid) },
      { [skipToPrevPropName]: () => prev(uid) } */
    ].reduce((acc, x) => ({ ...acc, ...x }), {});

  const memoizedProps = {};
  const propsBuilderWithMemoize = (props, next, prev, uid) => {
    const { prevProps, prevNext, prevPrev } = memoizedProps[uid];
    if (!shallowEquals(prevProps, props) || prevNext !== next || prevPrev !== prev) {
      memoizedProps[uid] = {
        prevProps: props,
        prevNext: next,
        prevPrev: prev,
        props: propsBuilder(props, next, prev, uid)
      };
    }
    return memoizedProps[uid].props;
  };
  // todo maybe move memoize to somewhere else so that it can be cleaned

  return (SomeComponent) => {
    return React.forwardRef(
      ({ autoFocusOrder, ...props }, ref) => {
        return (
          <AutoFocusContext.Consumer>
            {
              ({ subscribe, next, prev }) => (
                <UniqueIdProvider
                  next={ next }
                  prev={ prev }
                >
                  {
                    (uid) => (
                      <SomeComponent
                        { ...props }
                        ref={ subscribe(ref, focusExtractor, autoFocusOrder, uid) }
                        { ...propsBuilderWithMemoize(props, next, prev, uid) }
                      />
                    )
                  }
                </UniqueIdProvider>
              )
            }
          </AutoFocusContext.Consumer>
        );
      }
    );
  };
};


