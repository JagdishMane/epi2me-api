-- Up
CREATE TABLE IF NOT EXISTS meta (version CHAR(12) DEFAULT '' NOT NULL, idWorkflowInstance INTEGER UNSIGNED);
CREATE TABLE IF NOT EXISTS folders (folder_id INTEGER PRIMARY KEY, folder_path CHAR(255) DEFAULT '' NOT NULL);
CREATE TABLE IF NOT EXISTS uploads (
  filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY,
  path_id INTEGER NOT NULL,
  FOREIGN KEY(path_id) REFERENCES folders(folder_id)
);
CREATE TABLE IF NOT EXISTS skips (
  filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY,
  path_id INTEGER NOT NULL,
  FOREIGN KEY(path_id) REFERENCES folders(folder_id)
);
CREATE TABLE IF NOT EXISTS splits (
  filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY,
  parent CHAR(255) DEFAULT '' NOT NULL,
  child_path_id INTEGER NOT NULL,
  start DATETIME NOT NULL,
  end DATETIME,
  FOREIGN KEY(child_path_id) REFERENCES folders(folder_id)
);
-- Down
DROP TABLE meta;
DROP TABLE folders;
DROP TABLE uploads;
DROP TABLE skips;
DROP TABLE split;
