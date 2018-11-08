const debug = require('debug')('meta:listDirectories');
const fs = require('fs');
const path = require('path');
const union = require('lodash.union');
const findupSync = require('findup-sync');

const scopeRegex = /^@.+/;
const regex = /^meta-.*/;

module.exports = dir => {
  const localdir = findupSync('node_modules', { cwd: process.cwd() });

  debug(`listing all child directories matching ${regex} in ${localdir}`);

  var localPlugins, localPluginsFullPath;

  try {

    let scopeDirs = fs.readdirSync(localdir)
      .filter(file => {
        return (
          (fs.statSync(path.join(localdir, file)).isDirectory() ||
            fs.lstatSync(path.join(localdir, file)).isSymbolicLink()) &&
          scopeRegex.test(file)
        );
      })
      .map(file => path.join(localdir, file));

    localPlugins = [];
    localPluginsFullPath = [];
    [localdir, ...scopeDirs].map((baseDir) => {
      debug(`listing all child directories matching ${regex} in ${baseDir}`);

      return fs.readdirSync(baseDir)
        .filter(file => {
          return (
            (fs.statSync(path.join(baseDir, file)).isDirectory() ||
              fs.lstatSync(path.join(baseDir, file)).isSymbolicLink()) &&
            regex.test(file)
          );
        })
        .map(file => {
          localPlugins.push(file);
          return path.join(baseDir, file);
        });
      })
      .forEach(pluginDirs => localPluginsFullPath.push(...pluginDirs));

    debug(`found local plugins ${localPluginsFullPath}`);
  } catch (error) {
    debug(`no meta plugins found in ${localdir}`);
    localPlugins = [];
  }

  debug(`listing all child directories matching ${regex} in ${dir}`);

  const globalPlugins = fs.readdirSync(dir).filter(file => {
    return (
      (fs.statSync(path.join(dir, file)).isDirectory() ||
        !fs.lstatSync(path.join(dir, file)).isSymbolicLink()) &&
      regex.test(file) &&
      localPlugins.indexOf(file) === -1
    );
  });

  debug(`found global plugins ${globalPlugins}`);

  const globalPluginsFullPath = globalPlugins.map(r => {
    return path.resolve(dir, r);
  });

  return union(localPluginsFullPath, globalPluginsFullPath).sort((a, b) => {
    if (path.basename(a) < path.basename(b)) return -1;
    if (path.basename(a) > path.basename(b)) return 1;
    return 0;
  });

  return globalPlugins;
};
