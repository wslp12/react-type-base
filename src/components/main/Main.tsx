import React, { useState } from 'react';

function Main() {
  const [count, setCount] = useState(0);

  const handleOnClick = () => {
    if (count > 5) {
      console.log(1);
      throw new Error('asd');
    }

    setCount(count + 1);
  };
  // const asdf = 'asdf';

  return (
    <button onClick={handleOnClick} type="button">
      {count}
    </button>
  );
}

export default Main;
