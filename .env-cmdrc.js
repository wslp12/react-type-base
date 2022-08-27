/**
 * 아래 로직은 외부 모듈을 불러와 환경 변수를 세팅 할 경우 참조
 * git ignore 처리 하고 사용하세요
 */
// import('./src/api/server-type/socket-enum.js')
//     .then((server) => {

const env = {
  prod: {
    R_MODE: 'production',
    R_RUN_MODE: 'production',
  },
  local: {
    R_MODE: 'development',
    R_RUN_MODE: 'local',
  },
};

module.exports = new Promise((resolve) => {
  resolve(env);
});
