import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';

const user = {
  id: 202,
};

describe('App', () => {
  it('App 컴포넌트가 hello 를 출력하지 못하였음', () => {
    render(<App />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
