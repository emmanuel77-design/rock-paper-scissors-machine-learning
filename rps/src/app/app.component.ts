import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as tf from '@tensorflow/tfjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Rock Paper Scissors';
  computerScore: number = 0;
  computerMove: string = '??';
  playerScore: number = 0;
  playerMove: string = '';
  countdown: number = 3;
  countdownVisible: boolean = false;
  showMoves: boolean = false;
  model: tf.GraphModel | null = null;
  modelIsLoading: boolean = true;
  winnerVisible: boolean = false;
  winnerStatement: string = '';

  @ViewChild('videoElem', { static: true }) videoElem!: ElementRef;
  @ViewChild('canvasElem', { static: true }) canvasElem!: ElementRef;

  private readonly moves: Map<string, string> = new Map([
    ['rock', '✊🏽'],
    ['paper', '✋🏽'],
    ['scissors', '✌🏽']
  ]);
  private readonly labels = ['rock', 'paper', 'scissors'];

  constructor () {
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: 640,
        height: 480
      }
    })
      .then(stream => this.videoElem.nativeElement.srcObject = stream);

    this.loadModel();
  }

  async loadModel() {
    try {
      this.model = await tf.loadGraphModel('assets/web_model/model.json');
    } catch (error) {
      console.log(error);
      alert('Failed to load the model.');
    } finally {
      this.modelIsLoading = false;
    }
  }

  playGame() {
    this.countdown = 3;
    this.countdownVisible = true;
    this.videoElem.nativeElement.play();
    this.showMoves = false;
    this.computerMove = '??';

    // const shuffleIntervalForComputer = setInterval(() => {
    //   if (this.countdown === 0) {
    //     clearInterval(shuffleIntervalForComputer);
    //   }
      
    //   this.computerMove = Array.from(this.moves.values())[Math.floor(Math.random() * this.moves.size)];
    // }, 100);

    const countdownInterval = setInterval(async () => {
      this.countdown--;
      if (this.countdown === 0) {
        this.countdownVisible = false;
        clearInterval(countdownInterval);

        // make a random choice for the computer
        this.computerMove = Array.from(this.moves.values())[Math.floor(Math.random() * this.moves.size)];

        await this.capturePlayerMove();
        this.showMoves = true;
        this.compareMoves();
      }
    }, 1000);
  }

  async capturePlayerMove() {
    // pause the video
    this.videoElem.nativeElement.pause();

    // bounding rect of elements
    const videoRect = { width: this.videoElem.nativeElement.videoWidth, height: this.videoElem.nativeElement.videoHeight };

    // capture image from video and paint to canvas
    this.canvasElem.nativeElement.width = videoRect.width;
    this.canvasElem.nativeElement.height = videoRect.height;
    const context = this.canvasElem.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(this.videoElem.nativeElement, 0, 0);

    // TODO: try to crop the image around the handFrameElem
    
    // record player's move
    this.playerMove = await this.predict(this.canvasElem.nativeElement);
  }

  async predict(canvasElem: HTMLCanvasElement): Promise<string> {
    // reshape the image to 150x150 pixels
    const imageTensor = tf.browser.fromPixels(canvasElem)
      .resizeNearestNeighbor([150, 150])
      .toFloat()
      .div(255.0)
      .expandDims();

    const predictedClasses = this.model?.predict(imageTensor) as tf.Tensor;

    let predictedMove = '';

    if (predictedClasses) {
      const confidenceArray = await predictedClasses.array() as number[][];
      const predictedClassIndex = confidenceArray[0].indexOf(Math.max(...confidenceArray[0]));

      predictedMove = this.moves.get(this.labels[predictedClassIndex]) || '';
    }

    if (predictedMove === '') {
      alert('Failed to predict the move.');
    }

    return predictedMove;
  }

  compareMoves() {
    console.log(`Player: ${this.playerMove} vs Computer: ${this.computerMove}`);
    
    if (this.playerMove === this.computerMove) {
      this.declareWinner("It's a tie!");
      return;
    }

    if (this.playerMove === '✊🏽' && this.computerMove === '✌🏽') {
      this.playerScore++;
      this.declareWinner('You won!');
    } else if (this.playerMove === '✋🏽' && this.computerMove === '✊🏽') {
      this.playerScore++;
      this.declareWinner('You won!');
    } else if (this.playerMove === '✌🏽' && this.computerMove === '✋🏽') {
      this.playerScore++;
      this.declareWinner('You won!');
    } else {
      this.computerScore++;
      this.declareWinner('Computer won! 🤖');
    }
  }

  declareWinner(winnerMsg: string) {
    this.winnerVisible = true;
    this.winnerStatement = winnerMsg;

    setTimeout(() => {
      this.winnerVisible = false;
    }
    , 5000);
  }

  resetGame() {
    this.countdownVisible = false;
    this.computerScore = 0;
    this.playerScore = 0;
    this.computerMove = '??';
    this.playerMove = '';
    this.showMoves = false;
    this.videoElem.nativeElement.play();
  }
}
