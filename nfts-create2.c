#define _POSIX_C_SOURCE 200809L
#include <stdbool.h>
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <getopt.h>
#include <time.h>
#include <err.h>

#include <sqlite3.h>
#include <jansson.h>

typedef struct {
  char *o; // db
  bool q;  // quiet

  sqlite3 *db;
} Conf;

void usage() {
  fprintf(stderr, "Usage: nfts-md2json [-p prefix] file1.md [file2.md ...] | nfts-create -o file.sqlite3 [-q]\n");
  exit(1);
}

void parse_opt(Conf *conf, int argc, char **argv) {
  int opt;
  while ((opt = getopt(argc, argv, "qo:")) != -1) {
    switch (opt) {
    case 'o': conf->o = optarg; break;
    case 'q': conf->q = true; break;
    default: usage();
    }
  }
  if (!conf->o) usage();
}

const char* append_to_fts(Conf *conf, json_t *root) {
  const char *file = json_string_value(json_object_get(root, "file"));
  const char *subject = json_string_value(json_object_get(root, "subject"));
  const char *body = json_string_value(json_object_get(root, "body"));
  size_t date = json_integer_value(json_object_get(root, "date"));
  if ( !(file && subject && body)) return "invalid json";

  sqlite3_stmt *stm;
  if (sqlite3_prepare_v2(conf->db,
                         "INSERT INTO fts(file,subject,date,body) VALUES (?,?,?,?)",
                         -1, &stm, NULL) != SQLITE_OK)
    return sqlite3_errmsg(conf->db);
  sqlite3_bind_text(stm, 1, file, -1, SQLITE_STATIC);
  sqlite3_bind_text(stm, 2, subject, -1, SQLITE_STATIC);
  sqlite3_bind_int(stm, 3, date);
  sqlite3_bind_text(stm, 4, body, -1, SQLITE_STATIC);

  if (sqlite3_step(stm) != SQLITE_DONE) return sqlite3_errmsg(conf->db);

  sqlite3_finalize(stm);
  return NULL;
}

const char* append_to_metatags(Conf *conf, json_t *root) {
  const char *file = json_string_value(json_object_get(root, "file"));
  json_t *authors = json_object_get(root, "authors");
  json_t *tags = json_object_get(root, "tags");
  if ( !(file && authors && tags)) return "invalid json";

  sqlite3_stmt *stm;
  if (sqlite3_prepare_v2(conf->db,
                         "INSERT INTO metatags(file,type,name) VALUES (?,?,?)",
                         -1, &stm, NULL) != SQLITE_OK)
    return sqlite3_errmsg(conf->db);

  size_t _;
  json_t *val;
  json_array_foreach(authors, _, val) {
    sqlite3_reset(stm);
    sqlite3_clear_bindings(stm);
    sqlite3_bind_text(stm, 1, file, -1, SQLITE_STATIC);
    sqlite3_bind_text(stm, 2, "author", -1, SQLITE_STATIC);
    sqlite3_bind_text(stm, 3, json_string_value(val), -1, SQLITE_STATIC);

    if (sqlite3_step(stm) != SQLITE_DONE) return sqlite3_errmsg(conf->db);
  }

  json_array_foreach(tags, _, val) {
    sqlite3_reset(stm);
    sqlite3_clear_bindings(stm);
    sqlite3_bind_text(stm, 1, file, -1, SQLITE_STATIC);
    sqlite3_bind_text(stm, 2, "tag", -1, SQLITE_STATIC);
    sqlite3_bind_text(stm, 3, json_string_value(val), -1, SQLITE_STATIC);

    if (sqlite3_step(stm) != SQLITE_DONE) return sqlite3_errmsg(conf->db);
  }

  sqlite3_finalize(stm);
  return NULL;
}

char* mk_tables(Conf *conf) {
  char *e = NULL;
  int r = sqlite3_exec(conf->db, "CREATE VIRTUAL TABLE fts USING "
                       "fts5(file UNINDEXED,subject UNINDEXED,date UNINDEXED,body);"
                       "CREATE TABLE metatags(file,type,name)", NULL, 0, &e);
  return r != SQLITE_OK ? e : NULL;
}

int main(int argc, char**argv) {
  Conf conf = { .q = false };
  parse_opt(&conf, argc, argv);

  unlink(conf.o);
  if (sqlite3_open(conf.o, &conf.db))
    errx(1, "%s: %s", conf.o, sqlite3_errmsg(conf.db));
  sqlite3_exec(conf.db, "PRAGMA synchronous = OFF", 0, 0, 0);

  char *error = mk_tables(&conf);
  if (error) errx(1, "sql: %s", error);

  char *line = NULL;
  size_t _ = 0, line_num = 1, total = 0;
  while (getdelim(&line, &_, '\n', stdin) != -1) {
    json_error_t e;
    json_t *root = json_loads(line, 0, &e); // parse json
    if (!root) { warnx("line %ld: %s", line_num, e.text); break; }

    if (line_num == 1) {
      total = json_integer_value(json_object_get(root, "total"));
      // TODO: init progress bar
    } else {
      const char *r = append_to_fts(&conf, root);
      if (r) { warnx("line %ld, %s", line_num, r); break; }
      r = append_to_metatags(&conf, root);
      if (r) { warnx("line %ld, %s", line_num, r); break; }
      // TODO: update progress bar
    }

    json_decref(root);
    line_num++;
  }
  free(line);

  sqlite3_close(conf.db);
}
