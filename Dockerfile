FROM node:14

USER node

COPY --chown=node ./src /home/node/app/src
COPY --chown=node ./package.json /home/node/app/package.json
COPY --chown=node ./package-lock.json /home/node/app/package-lock.json

WORKDIR /home/node/app/

RUN npm i -ci

ENTRYPOINT ["npm", "start"]
CMD []
