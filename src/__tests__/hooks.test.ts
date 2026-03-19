import { renderHook } from '@testing-library/react-hooks';
import { useMyCustomHook } from '../hooks/useMyCustomHook';

describe('useMyCustomHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyCustomHook());
    expect(result.current.myValue).toBe('initial value');
  });

  it('should update value when update function is called', () => {
    const { result } = renderHook(() => useMyCustomHook());
    act(() => {
      result.current.updateValue('new value');
    });
    expect(result.current.myValue).toBe('new value');
  });
});

// Additional tests for other utilities and hooks can be added here