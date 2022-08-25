import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Item() {
  const { itemParam } = useParams();

  useEffect(() => {
    console.log('mount');

    return () => console.log('unmount');
  }, []);
  return <div>{itemParam}</div>;
}

export default Item;
