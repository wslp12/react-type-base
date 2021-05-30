import React from 'react';
import './Login.css';

function Login() {
  return (
    <div className="wh fbc fcenter">
      <div className="fbc fcenter">
        <div>
          <input type="text" placeholder="id" />
          <br />
          <input type="password" placeholder="password" />
        </div>
        <div className="w">
          <button type="button" className="w">
            로그인
          </button>
          <br />
          <button type="button" className="w">
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
