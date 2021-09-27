import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('App 컴포넌트가 hello 가 출력이 됨 ', () => {
    render(<App />);
    // expect(screen.getByText('hello')).toBeInTheDocument();
    const appElement = screen.getByTestId('app-1');
    expect(appElement).toBeInTheDocument();
    expect(appElement).toHaveTextContent('Hello');
  });
});
