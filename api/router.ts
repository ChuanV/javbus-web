import { Router } from 'express'
import createError from 'http-errors'

import {
  getMovieDetail,
  getMovieMagnets,
  getMoviesByKeywordAndPage,
  getMoviesByPage,
  getStarInfo,
  getGenreMovies,
  getAllGenres,
} from './javbus-parser.js'
import type { MagnetType, MovieType, SortBy, SortOrder } from './types.js'
import { validate } from './validator-utils.js'
import {
  magnetsValidator,
  moviesPageValidator,
  searchMoviesPageValidator,
  typeValidator,
  baseMoviesPageValidator,
} from './validators.js'

const movieRouter = Router()

movieRouter.get('/', validate(moviesPageValidator), async (req, res, next) => {
  try {
    const response = await getMoviesByPage(req.query)

    res.json(response)
  } catch (e) {
    next(e)
  }
})

movieRouter.get('/search', validate(searchMoviesPageValidator), async (req, res, next) => {
  const query = req.query

  const page = query.page as string
  const magnet = query.magnet as MagnetType
  const type = query.type as MovieType | undefined
  const keyword = query.keyword as string

  try {
    const response = await getMoviesByKeywordAndPage(keyword.trim(), page, magnet, type)
    res.json(response)
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) {
      res.json({
        movies: [],
        pagination: { currentPage: Number(page), hasNextPage: false, nextPage: null, pages: [] },
        keyword,
      })
    } else {
      next(e)
    }
  }
})

movieRouter.get('/:id', async (req, res, next) => {
  const movieId = req.params.id

  try {
    const movie = await getMovieDetail(movieId)
    
    // Add cache headers
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.json(movie)
  } catch (e) {
    console.error(`Error fetching movie ${movieId}:`, e instanceof Error ? e.message : e)
    // ś†ľŚľŹŚĆĖšłÄšłčťĒôŤĮĮ
    next(e instanceof Error && e.message.includes('404') ? new createError.NotFound() : e)
  }
})

const starRouter = Router()

starRouter.get('/:id', validate([typeValidator]), async (req, res, next) => {
  const { id: starId } = req.params

  if (!starId) {
    next(new createError.BadRequest('star id is required'))
    return
  }

  if (typeof starId !== 'string') {
    next(new createError.BadRequest('star id must be a string'))
    return
  }

  const type = req.query.type as MovieType | undefined

  try {
    const starInfo = await getStarInfo(starId, type)

    res.json(starInfo)
  } catch (e) {
    // 格式化一下错误
    next(e instanceof Error && e.message.includes('404') ? new createError.NotFound() : e)
  }
})


const genreRouter = Router();

genreRouter.get('/', validate([typeValidator]), async (req, res, next) => {
  const type = req.query.type as MovieType | undefined;

  try {
    const genres = await getAllGenres(type);

    res.json(genres);
  } catch (e) {
    next(e);
  }
});

genreRouter.get('/:id', validate([...baseMoviesPageValidator]), async (req, res, next) => {
  const genreId = req.params.id as string;
  const page = (req.query.page as string) || '1';
  const type = req.query.type as MovieType | undefined;
  const magnet = req.query.magnet as MagnetType | undefined;

  try {
    const response = await getGenreMovies(genreId, page, type, magnet);

    res.json(response);
  } catch (e) {
    // 格式化一下错误
    next(e instanceof Error && e.message.includes('404') ? new createError.NotFound() : e);
  }
});

const magnetRouter = Router()

magnetRouter.get('/:movieId', validate(magnetsValidator), async (req, res, next) => {
  const { movieId } = req.params

  if (!movieId) {
    next(new createError.BadRequest('movie id is required'))
    return
  }

  if (typeof movieId !== 'string') {
    next(new createError.BadRequest('movie id must be a string'))
    return
  }

  const gid = req.query.gid as string
  const uc = req.query.uc as string
  const sortBy = req.query.sortBy as SortBy | undefined
  const sortOrder = req.query.sortOrder as SortOrder | undefined

  try {
    const magnets = await getMovieMagnets({ movieId, gid, uc, sortBy, sortOrder })

    res.json(magnets)
  } catch (e) {
    next(e)
  }
})

const router = Router()

router.use('/movies', movieRouter)
router.use('/stars', starRouter)
router.use('/magnets', magnetRouter)
router.use('/genres', genreRouter);

export default router
