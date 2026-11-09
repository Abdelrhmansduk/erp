import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

describe('appStore (State & Navigation Store)', () => {
  beforeEach(() => {
    useAppStore.setState({
      flowState: 'landing',
      activeTab: 'dashboard',
      activeTabTitle: 'الرئيسية والمؤشرات التشغيلية',
      notifications: [],
      unreadCount: 0,
      activeCompanyId: 'all',
    });
  });

  it('should switch flowState correctly', () => {
    const { setFlowState } = useAppStore.getState();
    setFlowState('workspace');
    expect(useAppStore.getState().flowState).toBe('workspace');
  });

  it('should update activeTab and automatically set flowState to workspace', () => {
    const { setActiveTab } = useAppStore.getState();
    setActiveTab('recruitment-contracts', 'عقود التوسط والاستقدام');

    const state = useAppStore.getState();
    expect(state.activeTab).toBe('recruitment-contracts');
    expect(state.activeTabTitle).toBe('عقود التوسط والاستقدام');
    expect(state.flowState).toBe('workspace');
  });

  it('should add notifications and manage unread count', () => {
    const { addNotification, markAllAsRead } = useAppStore.getState();

    addNotification({
      title: 'وصول رحلة جديدة',
      message: 'وصلت الرحلة رقم SV-101 بمطار الرياض',
      type: 'success',
    });

    let state = useAppStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);

    markAllAsRead();
    state = useAppStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications[0].read).toBe(true);
  });
});
