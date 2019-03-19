const ExternalWindowEventAdapter = require('../external_window_event_adapter');
import { app as electronApp, ExternalWindow, WinEventHookEmitter } from 'electron';
import { Bounds } from '../../../js-adapter/src/shapes';
import { EventEmitter } from 'events';
import { extendNativeWindowInfo } from '../utils';
import { Identity } from '../../../js-adapter/src/identity';
import * as NativeWindowModule from './native_window';
import * as Shapes from '../../shapes';
import InjectionBus from '../transports/injection_bus';
import ofEvents from '../of_events';
import route from '../../common/route';
import WindowGroups from '../window_groups';
import { OF_EVENT_FROM_WINDOWS_MESSAGE } from '../../common/windows_messages';

export const externalWindows = new Map<string, Shapes.ExternalWindow>();
const winEventHooksEmitters = new Map<string, WinEventHookEmitter>();
const injectionBuses = new Map<string, InjectionBus>();

export async function addEventListener(identity: Identity, eventName: string, listener: Shapes.Listener): Promise<() => void> {
  const externalWindow = getExternalWindow(identity);
  const emitterKey = getEmitterKey(externalWindow);
  let globalWinEventHooksEmitter = winEventHooksEmitters.get('*');
  let winEventHooksEmitter = winEventHooksEmitters.get(emitterKey);
  const injectionBus = getInjectionBus(externalWindow);

  // Global Windows' event hook emitters
  if (eventName === 'external-window-created' && !globalWinEventHooksEmitter) {
    globalWinEventHooksEmitter = subToGlobalWinEventHooks();
    winEventHooksEmitters.set('*', globalWinEventHooksEmitter);
  }

  // Windows' event hook emitters
  if (!winEventHooksEmitter) {
    winEventHooksEmitter = subToWinEventHooks(externalWindow);
    winEventHooksEmitters.set(emitterKey, winEventHooksEmitter);
  }

  // Native window injection events
  if (eventName === 'blurred') {
    await injectionBus.on('WM_KILLFOCUS', (data) => {
      externalWindow.emit(eventName, data);
    });
  }

  externalWindow.on(eventName, listener);

  return () => externalWindow.removeListener(eventName, listener);
}

export function animateExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.noop(externalWindow);
}

export function bringExternalWindowToFront(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.bringToFront(externalWindow);
}

export function closeExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.close(externalWindow);
}

export async function disableExternalWindowUserMovement(identity: Identity): Promise<void> {
  const externalWindow = getExternalWindow(identity);
  const injectionBus = getInjectionBus(externalWindow);
  await injectionBus.set({ userMovement: false });
  // TODO: enable user movement when requestors go away
}

export async function enableExternaWindowUserMovement(identity: Identity): Promise<void> {
  const externalWindow = getExternalWindow(identity);
  const injectionBus = getInjectionBus(externalWindow);
  await injectionBus.set({ userMovement: true });
}

export function flashExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.flash(externalWindow);
}

export function focusExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.focus(externalWindow);
}

export function getExternalWindowBounds(identity: Identity): Bounds {
  const externalWindow = getExternalWindow(identity);
  return NativeWindowModule.getBounds(externalWindow);
}

export function getExternalWindowGroup(identity: Identity): Shapes.GroupWindowIdentity[] {
  const externalWindow = getExternalWindow(identity);
  const windowGroup = WindowGroups.getGroup(externalWindow.groupUuid);
  return windowGroup.map(({ name, uuid, isExternalWindow }) => ({ name, uuid, windowName: name, isExternalWindow }));
}

export function getExternalWindowInfo(identity: Identity): Shapes.NativeWindowInfo {
  const { uuid } = identity;
  const rawNativeWindowInfo = electronApp.getNativeWindowInfoForNativeId(uuid);
  return extendNativeWindowInfo(rawNativeWindowInfo);
}

export function getExternalWindowState(identity: Identity): string {
  const externalWindow = getExternalWindow(identity);
  return NativeWindowModule.getState(externalWindow);
}

export function hideExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.hide(externalWindow);
}

export function isExternalWindowShowing(identity: Identity): boolean {
  const externalWindow = getExternalWindow(identity);
  return NativeWindowModule.isVisible(externalWindow);
}

export function joinExternalWindowGroup(identity: Identity, groupingIdentity: Identity): void {
  getExternalWindow(identity);
  WindowGroups.joinGroup(identity, groupingIdentity);
}

export function leaveExternalWindowGroup(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  WindowGroups.leaveGroup(externalWindow);
}

export function maximizeExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.maximize(externalWindow);
}

export function mergeExternalWindowGroups(identity: Identity, groupingIdentity: Identity): void {
  getExternalWindow(identity);
  WindowGroups.mergeGroups(identity, groupingIdentity);
}

export function minimizeExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.minimize(externalWindow);
}

export function moveExternalWindowBy(identity: Identity, payload: Shapes.MoveWindowByOpts): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.moveBy(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function moveExternalWindow(identity: Identity, payload: Shapes.MoveWindowToOpts): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.moveTo(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function registerNativeExternalWindow(identity: Identity): void {
  getExternalWindow(identity);
}

export function resizeExternalWindowBy(identity: Identity, payload: Shapes.ResizeWindowByOpts): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.resizeBy(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function resizeExternalWindowTo(identity: Identity, payload: Shapes.ResizeWindowToOpts): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.resizeTo(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function restoreExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.restore(externalWindow);
}

export function setExternalWindowAsForeground(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.setAsForeground(externalWindow);
}

export function setExternalWindowBounds(identity: Identity, payload: Bounds): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.setBounds(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function showExternalWindowAt(identity: Identity, payload: Shapes.ShowWindowAtOpts): void {
  const externalWindow = getExternalWindow(identity);
  const windowInfo = getExternalWindowInfo(identity);
  NativeWindowModule.showAt(externalWindow, payload);
  emitBoundsChangedEvent(identity, windowInfo);
}

export function showExternalWindow(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.show(externalWindow);
}

export function stopExternalWindowFlashing(identity: Identity): void {
  const externalWindow = getExternalWindow(identity);
  NativeWindowModule.stopFlashing(externalWindow);
}

/*
  Returns a key for emitter maps
*/
function getEmitterKey(externalWindow: Shapes.ExternalWindow): string {
  const { nativeId } = externalWindow;
  const pid = electronApp.getProcessIdForNativeId(nativeId);
  return `${pid}-${nativeId}`;
}

/*
  Returns a registered native window or creates a new one if not found.
*/
export function getExternalWindow(identity: Identity): Shapes.ExternalWindow {
  const { uuid } = identity;
  let externalWindow = externalWindows.get(uuid);

  if (!externalWindow) {
    externalWindow = <Shapes.ExternalWindow>(new ExternalWindow({ hwnd: uuid }));
    applyWindowGroupingStub(externalWindow);
    externalWindows.set(uuid, externalWindow);
  }

  return externalWindow;
}

/*
  Gets (creates when missing) injection bus for specified external window
*/
function getInjectionBus(externalWindow: Shapes.ExternalWindow): InjectionBus {
  const emitterKey = getEmitterKey(externalWindow);
  let injectionBus = injectionBuses.get(emitterKey);

  if (!injectionBus) {
    const { nativeId } = externalWindow;
    const eventAddapter = new ExternalWindowEventAdapter(externalWindow);
    injectionBus = new InjectionBus({ nativeId });
    injectionBuses.set(emitterKey, injectionBus);
  }

  return injectionBus;
}

/*
  Emit "bounds-changed" event for a specific external window, if bounds changed.
*/
function emitBoundsChangedEvent(identity: Identity, previousNativeWindowInfo: Shapes.NativeWindowInfo): void {
  const externalWindow = getExternalWindow(identity);
  const currentWindowInfo = getExternalWindowInfo(identity);
  const boundsChanged =
    previousNativeWindowInfo.bounds.height !== currentWindowInfo.bounds.height ||
    previousNativeWindowInfo.bounds.width !== currentWindowInfo.bounds.width ||
    previousNativeWindowInfo.bounds.x !== currentWindowInfo.bounds.x ||
    previousNativeWindowInfo.bounds.y !== currentWindowInfo.bounds.y;

  if (boundsChanged) {
    externalWindow.once('bounds-changing', () => {
      externalWindow.emit('bounds-changed', currentWindowInfo);
    });
  }
}

/*
  Subsribes to global win32 events
*/
function subToGlobalWinEventHooks(): WinEventHookEmitter {
  const winEventHooks = new WinEventHookEmitter();

  winEventHooks.on('EVENT_OBJECT_CREATE', (sender: EventEmitter, rawNativeWindowInfo: Shapes.RawNativeWindowInfo, timestamp: number) => {
    const windowInfo = extendNativeWindowInfo(rawNativeWindowInfo);
    ofEvents.emit(route.system('external-window-created'), windowInfo);
  });

  return winEventHooks;
}

/*
  Subscribe to win32 events and propogate appropriate events to native window.
*/
function subToWinEventHooks(externalWindow: Shapes.ExternalWindow): WinEventHookEmitter {
  const { nativeId } = externalWindow;
  const pid = electronApp.getProcessIdForNativeId(nativeId);
  const winEventHooks = new WinEventHookEmitter({ pid });

  let previousNativeWindowInfo = electronApp.getNativeWindowInfoForNativeId(nativeId);

  const listener = (
    parser: (nativeWindowInfo: Shapes.NativeWindowInfo) => void,
    sender: EventEmitter,
    rawNativeWindowInfo: Shapes.RawNativeWindowInfo,
    timestamp: number
  ): void => {
    const nativeWindowInfo = extendNativeWindowInfo(rawNativeWindowInfo);

    // Since we are subscribing to a process, we are only interested in a
    // specific window.
    if (nativeWindowInfo.uuid !== nativeId) {
      return;
    }

    parser(nativeWindowInfo);
    previousNativeWindowInfo = nativeWindowInfo;
  };

  winEventHooks.on('EVENT_OBJECT_SHOW', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    externalWindow.emit('shown', nativeWindowInfo);
  }));

  winEventHooks.on('EVENT_OBJECT_HIDE', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    externalWindow.emit('hidden', nativeWindowInfo);
  }));

  winEventHooks.on('EVENT_OBJECT_DESTROY', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    const emitterKey = getEmitterKey(externalWindow);
    const winEventHooksEmitter = winEventHooksEmitters.get(emitterKey);
    const nativeWindowInjectionBus = injectionBuses.get(emitterKey);

    externalWindow.emit('closing', nativeWindowInfo);
    winEventHooks.removeAllListeners();
    externalWindows.delete(nativeId);
    winEventHooksEmitters.delete(emitterKey);
    externalWindow.emit('closed', nativeWindowInfo);
    externalWindow.removeAllListeners();

    winEventHooksEmitter.removeAllListeners();
    winEventHooksEmitters.delete(emitterKey);

    nativeWindowInjectionBus.removeAllListeners();
    injectionBuses.delete(emitterKey);
  }));

  winEventHooks.on('EVENT_OBJECT_FOCUS', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    externalWindow.emit('focused', nativeWindowInfo);
  }));

  winEventHooks.on('EVENT_SYSTEM_MOVESIZESTART', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    externalWindow.emit('begin-user-bounds-changing', nativeWindowInfo);
  }));

  winEventHooks.on('EVENT_SYSTEM_MOVESIZEEND', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    externalWindow.emit('end-user-bounds-changing', nativeWindowInfo);
    externalWindow.emit('bounds-changed', nativeWindowInfo);
  }));

  winEventHooks.on('EVENT_OBJECT_LOCATIONCHANGE', listener.bind(null, (nativeWindowInfo: Shapes.NativeWindowInfo) => {
    if (nativeWindowInfo.maximized && !previousNativeWindowInfo.maximized) {
      externalWindow.emit('maximized', nativeWindowInfo);
    } else if (nativeWindowInfo.minimized && !previousNativeWindowInfo.minimized) {
      externalWindow.emit('minimized', nativeWindowInfo);
    } else if (!nativeWindowInfo.maximized && previousNativeWindowInfo.maximized) {
      externalWindow.emit('restored', nativeWindowInfo);
    } else if (!nativeWindowInfo.minimized && previousNativeWindowInfo.minimized) {
      externalWindow.emit('restored', nativeWindowInfo);
    } else if (!nativeWindowInfo.minimized) {
      // Don't emit bounds-changing when the window is minimized, because it's
      // not being restored first automatically like for a maximized window,
      // and so the event is being triggerred even though the window's bounds
      // are not changing.
      externalWindow.emit('bounds-changing', nativeWindowInfo);
    }
  }));

  return winEventHooks;
}

// Window grouping stub (makes external windows work with our original disabled frame group tracker)
function applyWindowGroupingStub(externalWindow: Shapes.ExternalWindow): Shapes.GroupWindow {
  const { nativeId } = externalWindow;
  const identity = { uuid: nativeId };

  externalWindow._options = {
    uuid: nativeId,
    name: nativeId
  };
  externalWindow.browserWindow = externalWindow;
  externalWindow.isExternalWindow = true;
  externalWindow.name = nativeId;
  externalWindow.uuid = nativeId;
  externalWindow.isUserMovementEnabled = () => false;
  externalWindow.setUserMovementEnabled = async (enableUserMovement: boolean): Promise<void> => {
    const injectionBus = getInjectionBus(externalWindow);
    if (enableUserMovement) {
      await enableExternaWindowUserMovement(identity);
    } else {
      await disableExternalWindowUserMovement(identity);
      injectionBus.on('WM_ENTERSIZEMOVE', (data: any) => {
        const { mouseX, mouseY } = data;
        const coordinates = { x: mouseX, y: mouseY };
        const ofEvent = OF_EVENT_FROM_WINDOWS_MESSAGE.WM_ENTERSIZEMOVE;
        const routeName = route.externalWindow(ofEvent, nativeId, nativeId);
        ofEvents.emit(routeName, coordinates);
      });
      injectionBus.on('WM_MOVING', () => {
        const ofEvent = OF_EVENT_FROM_WINDOWS_MESSAGE.WM_MOVING;
        const routeName = route.externalWindow(ofEvent, nativeId, nativeId);
        ofEvents.emit(routeName);
      });
      injectionBus.on('WM_EXITSIZEMOVE', () => {
        const ofEvent = OF_EVENT_FROM_WINDOWS_MESSAGE.WM_EXITSIZEMOVE;
        const routeName = route.externalWindow(ofEvent, nativeId, nativeId);
        ofEvents.emit(routeName);
      });
    }
  };

  return externalWindow;
}