# 리액트 타입스크립트 베이스 프로젝트

해당 프로젝트는 [Create React App](https://github.com/facebook/create-react-app) 를 사용하지 않았습니다.

# init 환경설정

> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.

```json
{
  {
  "dev": {
    "ASDF": "dev ASDF"
  },
  "prod": {
    "PROD": "prod ASDF"
  }
}
```

---

### `yarn start`

프로젝트를 실행 시킵니다.\
[http://localhost:9000](http://localhost:9000) 에서 확인 가능합니다.

---

webpack.config.js 파일을 기준으로 dev server가 실행 됩니다.

### `yarn test`

Jest 라이브러리를 사용 하며 .test.tsx 파일을 테스트 합니다.

---

### `yarn build`

tsconfig.json 파일을 기준으로 빌드를 실행 합니다

---

### 우측 하단의 필수 파일을 설치하기 바랍니다.

##### 필수 확장 리스트

- ###### [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) `dbaeumer.vscode-eslint`
- ###### [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=SimonSiefke.prettier-vscode) `SimonSiefke.prettier-vscode`
- ###### [Comment Anchors](https://marketplace.visualstudio.com/items?itemName=ExodiusStudios.comment-anchors) `ExodiusStudios.comment-anchors`
- ###### [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) `msjsdiag.debugger-for-chrome`
- ###### [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) `EditorConfig.EditorConfig`
