import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Main from './Main';

describe('App', function () {
  it('should display pass in number', function () {
    render(<Main />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
