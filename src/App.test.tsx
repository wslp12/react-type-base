import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';

const user = {
  id: 202,
};

describe('App', function () {
  it('should display pass in number', function () {
    render(<App />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
